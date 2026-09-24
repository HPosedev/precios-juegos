import { resolve } from 'path';
import {
  getAllTrackedGames,
  getTrackedGameById,
  saveTrackedGame,
  deleteTrackedGame,
} from './db';
import { searchAllGames, aggregateGamePrices } from './services/aggregator';
import { openAppInFirefox } from './utils/browser';
import type { TrackedGame } from './types';

const PORT = 3001;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    try {
      // 1. Search games: GET /api/search?q=query
      if (url.pathname === '/api/search' && req.method === 'GET') {
        const query = url.searchParams.get('q') || '';
        if (!query.trim()) {
          return new Response(JSON.stringify([]), { headers: corsHeaders() });
        }
        const results = await searchAllGames(query);
        return new Response(JSON.stringify(results), { headers: corsHeaders() });
      }

      // 2. Get all tracked games: GET /api/games
      if (url.pathname === '/api/games' && req.method === 'GET') {
        const games = getAllTrackedGames();
        return new Response(JSON.stringify(games), { headers: corsHeaders() });
      }

      // 3. Add game to tracking list: POST /api/games
      if (url.pathname === '/api/games' && req.method === 'POST') {
        const body = (await req.json()) as {
          title: string;
          imageUrl?: string;
          steamAppId?: number | null;
        };

        if (!body.title) {
          return new Response(JSON.stringify({ error: 'Title is required' }), {
            status: 400,
            headers: corsHeaders(),
          });
        }

        const id = `game-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const slug = body.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        // Fetch initial prices across all stores
        const aggResult = await aggregateGamePrices(body.title, body.steamAppId, body.imageUrl);

        const newGame: TrackedGame = {
          id,
          title: body.title,
          slug,
          imageUrl: aggResult.imageUrl || body.imageUrl || '',
          steamAppId: aggResult.steamAppId ?? body.steamAppId ?? null,
          addedAt: new Date().toISOString(),
          lastChecked: new Date().toISOString(),
          lowestPrice: aggResult.lowestOffer ? aggResult.lowestOffer.price : 0,
          lowestStore: aggResult.lowestOffer ? aggResult.lowestOffer.store : 'Pendiente',
          lowestRegion: aggResult.lowestOffer ? aggResult.lowestOffer.region : 'Europa',
          lowestUrl: aggResult.lowestOffer ? aggResult.lowestOffer.url : '#',
          lowestKeyType: aggResult.lowestOffer ? aggResult.lowestOffer.keyType : 'Clave Digital',
          officialPrice: aggResult.officialPrice,
          offers: aggResult.offers,
        };

        saveTrackedGame(newGame);

        return new Response(JSON.stringify(newGame), {
          status: 201,
          headers: corsHeaders(),
        });
      }

      // 4. Refresh single game: POST /api/games/:id/refresh
      const refreshMatch = url.pathname.match(/^\/api\/games\/([^/]+)\/refresh$/);
      if (refreshMatch && req.method === 'POST') {
        const id = refreshMatch[1];
        const existing = getTrackedGameById(id);
        if (!existing) {
          return new Response(JSON.stringify({ error: 'Game not found' }), {
            status: 404,
            headers: corsHeaders(),
          });
        }

        const aggResult = await aggregateGamePrices(
          existing.title,
          existing.steamAppId,
          existing.imageUrl
        );

        existing.lastChecked = new Date().toISOString();
        existing.offers = aggResult.offers;
        if (aggResult.imageUrl) existing.imageUrl = aggResult.imageUrl;
        if (aggResult.officialPrice) existing.officialPrice = aggResult.officialPrice;

        if (aggResult.lowestOffer) {
          existing.lowestPrice = aggResult.lowestOffer.price;
          existing.lowestStore = aggResult.lowestOffer.store;
          existing.lowestRegion = aggResult.lowestOffer.region;
          existing.lowestUrl = aggResult.lowestOffer.url;
          existing.lowestKeyType = aggResult.lowestOffer.keyType;
        }

        saveTrackedGame(existing);
        return new Response(JSON.stringify(existing), { headers: corsHeaders() });
      }

      // 5. Delete tracked game: DELETE /api/games/:id
      const deleteMatch = url.pathname.match(/^\/api\/games\/([^/]+)$/);
      if (deleteMatch && req.method === 'DELETE') {
        const id = deleteMatch[1];
        const deleted = deleteTrackedGame(id);
        if (!deleted) {
          return new Response(JSON.stringify({ error: 'Game not found' }), {
            status: 404,
            headers: corsHeaders(),
          });
        }
        return new Response(JSON.stringify({ success: true, id }), { headers: corsHeaders() });
      }

      // 6. Refresh all games: POST /api/games/refresh-all
      if (url.pathname === '/api/games/refresh-all' && req.method === 'POST') {
        const games = getAllTrackedGames();
        const updatedGames: TrackedGame[] = [];

        for (const game of games) {
          try {
            const aggResult = await aggregateGamePrices(
              game.title,
              game.steamAppId,
              game.imageUrl
            );
            game.lastChecked = new Date().toISOString();
            game.offers = aggResult.offers;
            if (aggResult.lowestOffer) {
              game.lowestPrice = aggResult.lowestOffer.price;
              game.lowestStore = aggResult.lowestOffer.store;
              game.lowestRegion = aggResult.lowestOffer.region;
              game.lowestUrl = aggResult.lowestOffer.url;
              game.lowestKeyType = aggResult.lowestOffer.keyType;
            }
            if (aggResult.officialPrice) game.officialPrice = aggResult.officialPrice;
            saveTrackedGame(game);
            updatedGames.push(game);
          } catch (err) {
            console.error(`Failed to refresh ${game.title}:`, err);
            updatedGames.push(game);
          }
        }

        return new Response(JSON.stringify(updatedGames), { headers: corsHeaders() });
      }

      // Static file serving from client/dist (SPA fallback)
      const distDir = resolve(process.cwd(), 'client', 'dist');
      let filePath = resolve(distDir, url.pathname.slice(1));
      let file = Bun.file(filePath);

      if (await file.exists()) {
        return new Response(file);
      }

      // SPA fallback to index.html
      const indexFile = Bun.file(resolve(distDir, 'index.html'));
      if (await indexFile.exists()) {
        return new Response(indexFile, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: corsHeaders(),
      });
    } catch (error: any) {
      console.error('API error:', error);
      return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
        status: 500,
        headers: corsHeaders(),
      });
    }
  },
});

console.log(`🚀 Game Key Tracker API running on http://localhost:${server.port}`);

openAppInFirefox(server.port).catch((err) => {
  console.error('Error al intentar abrir Firefox:', err);
});
