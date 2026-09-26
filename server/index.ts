import { resolve, sep } from 'path';
import {
  getAllTrackedGames,
  getTrackedGameById,
  findTrackedGame,
  saveTrackedGame,
  deleteTrackedGame,
} from './db';
import { searchAllGames, aggregateGamePrices } from './services/aggregator';
import { openAppInFirefox } from './utils/browser';
import type { TrackedGame } from './types';

const PORT = Number(process.env.PORT) || 3001;
const DIST_DIR = resolve(process.cwd(), 'client', 'dist');

// Max games refreshed at once by /api/games/refresh-all (each one already hits several stores in parallel)
const REFRESH_CONCURRENCY = 3;

// No CORS headers: the frontend is served from this same origin (or through the Vite proxy),
// so other websites open in the browser cannot read or modify the tracked list.
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Fetches fresh prices for a game and updates its fields in place.
 */
async function refreshGamePrices(game: TrackedGame): Promise<TrackedGame> {
  const aggResult = await aggregateGamePrices(game.title, game.steamAppId, game.imageUrl);
  const lowest = aggResult.lowestOffer;

  game.lastChecked = new Date().toISOString();
  game.offers = aggResult.offers;
  if (aggResult.imageUrl) game.imageUrl = aggResult.imageUrl;
  if (aggResult.steamAppId) game.steamAppId = aggResult.steamAppId;
  if (aggResult.officialPrice) game.officialPrice = aggResult.officialPrice;

  // When no offer is found, reset the summary so it doesn't show a stale price with 0 offers
  game.lowestPrice = lowest ? lowest.price : 0;
  game.lowestStore = lowest ? lowest.store : 'Pendiente';
  game.lowestRegion = lowest ? lowest.region : 'Europa';
  game.lowestUrl = lowest ? lowest.url : '#';
  game.lowestKeyType = lowest ? lowest.keyType : 'Clave Digital';

  return game;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    try {
      // 1. Search games: GET /api/search?q=query
      if (url.pathname === '/api/search' && req.method === 'GET') {
        const query = url.searchParams.get('q') || '';
        if (!query.trim()) {
          return json([]);
        }
        return json(await searchAllGames(query));
      }

      // 2. Get all tracked games: GET /api/games
      if (url.pathname === '/api/games' && req.method === 'GET') {
        return json(getAllTrackedGames());
      }

      // 3. Add game to tracking list: POST /api/games
      if (url.pathname === '/api/games' && req.method === 'POST') {
        let body: { title?: unknown; imageUrl?: string; steamAppId?: number | null };
        try {
          body = (await req.json()) as typeof body;
        } catch {
          return json({ error: 'Invalid JSON body' }, 400);
        }

        const title = typeof body?.title === 'string' ? body.title.trim() : '';
        if (!title) {
          return json({ error: 'Title is required' }, 400);
        }

        const slug = slugify(title);

        // Avoid tracking the same game twice
        const existing = findTrackedGame(slug, body.steamAppId);
        if (existing) {
          return json(existing);
        }

        const now = new Date().toISOString();
        const newGame: TrackedGame = {
          id: `game-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title,
          slug,
          imageUrl: body.imageUrl || '',
          steamAppId: body.steamAppId ?? null,
          addedAt: now,
          lastChecked: now,
          lowestPrice: 0,
          lowestStore: 'Pendiente',
          lowestRegion: 'Europa',
          lowestUrl: '#',
          lowestKeyType: 'Clave Digital',
          offers: [],
        };

        // Fetch initial prices across all stores
        await refreshGamePrices(newGame);
        saveTrackedGame(newGame);

        return json(newGame, 201);
      }

      // 4. Refresh all games: POST /api/games/refresh-all
      if (url.pathname === '/api/games/refresh-all' && req.method === 'POST') {
        const games = getAllTrackedGames();

        const updatedGames = await mapWithConcurrency(games, REFRESH_CONCURRENCY, async (game) => {
          try {
            await refreshGamePrices(game);
            saveTrackedGame(game);
          } catch (err) {
            console.error(`Failed to refresh ${game.title}:`, err);
          }
          return game;
        });

        return json(updatedGames);
      }

      // 5. Refresh single game: POST /api/games/:id/refresh
      const refreshMatch = url.pathname.match(/^\/api\/games\/([^/]+)\/refresh$/);
      if (refreshMatch && req.method === 'POST') {
        const existing = getTrackedGameById(refreshMatch[1]);
        if (!existing) {
          return json({ error: 'Game not found' }, 404);
        }

        await refreshGamePrices(existing);
        saveTrackedGame(existing);
        return json(existing);
      }

      // 6. Delete tracked game: DELETE /api/games/:id
      const deleteMatch = url.pathname.match(/^\/api\/games\/([^/]+)$/);
      if (deleteMatch && req.method === 'DELETE') {
        const id = deleteMatch[1];
        if (!deleteTrackedGame(id)) {
          return json({ error: 'Game not found' }, 404);
        }
        return json({ success: true, id });
      }

      if (url.pathname.startsWith('/api/')) {
        return json({ error: 'Not found' }, 404);
      }

      // Static file serving from client/dist (never outside of it)
      const filePath = resolve(DIST_DIR, url.pathname.slice(1));
      if (filePath.startsWith(DIST_DIR + sep)) {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          return new Response(file);
        }
      }

      // SPA fallback to index.html
      const indexFile = Bun.file(resolve(DIST_DIR, 'index.html'));
      if (await indexFile.exists()) {
        return new Response(indexFile, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      return new Response(
        'Frontend no compilado. Ejecuta "bun run build" o usa "bun run dev".',
        { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    } catch (error: any) {
      console.error('API error:', error);
      return json({ error: error.message || 'Internal error' }, 500);
    }
  },
});

console.log(`🚀 Game Key Tracker API running on http://localhost:${server.port}`);

openAppInFirefox(server.port).catch((err) => {
  console.error('Error al intentar abrir Firefox:', err);
});
