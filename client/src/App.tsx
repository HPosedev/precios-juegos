import { useState, useEffect } from 'react';
import type { TrackedGame } from './types';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { GameCard } from './components/GameCard';
import { Sidebar } from './components/Sidebar';
import {
  Gamepad2,
  ShieldCheck,
  Globe,
  Tag,
  ArrowUpDown,
  Search,
  AlertCircle,
  X,
} from 'lucide-react';

type SortOption = 'lowest' | 'title' | 'recent';

export function App() {
  const [games, setGames] = useState<TrackedGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [error, setError] = useState<string | null>(null);

  // Fetch tracked games on initial load
  useEffect(() => {
    const loadGames = async () => {
      try {
        const res = await fetch('/api/games');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TrackedGame[] = await res.json();
        setGames(data);
        if (data.length > 0) {
          setSelectedGameId((current) => current ?? data[0].id);
        }
      } catch (err) {
        console.error('Error loading games:', err);
        setError('No se pudo cargar la lista de juegos. ¿Está el servidor en marcha?');
      } finally {
        setIsLoading(false);
      }
    };
    loadGames();
  }, []);

  const handleSelectGame = (id: string) => {
    setSelectedGameId(id);
    // On small screens the detail panel sits above the list, so bring it into view
    if (window.matchMedia('(max-width: 1023px)').matches) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddGame = async (gameData: {
    title: string;
    imageUrl?: string;
    steamAppId?: number | null;
  }) => {
    try {
      setIsAdding(true);
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newGame: TrackedGame = await res.json();
      setGames((prev) => [newGame, ...prev.filter((g) => g.id !== newGame.id)]);
      // Automatically select the newly added game to show sidebar immediately
      handleSelectGame(newGame.id);
    } catch (err) {
      console.error('Error adding game:', err);
      setError(`No se pudo añadir "${gameData.title}". Inténtalo de nuevo.`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteGame = async (id: string) => {
    try {
      const res = await fetch(`/api/games/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setGames((prev) => prev.filter((g) => g.id !== id));
      setSelectedGameId((current) => (current === id ? null : current));
    } catch (err) {
      console.error('Error deleting game:', err);
      setError('No se pudo eliminar el juego. Inténtalo de nuevo.');
    }
  };

  const handleRefreshGame = async (id: string) => {
    try {
      setRefreshingIds((prev) => new Set(prev).add(id));
      const res = await fetch(`/api/games/${id}/refresh`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: TrackedGame = await res.json();
      setGames((prev) => prev.map((g) => (g.id === id ? updated : g)));
    } catch (err) {
      console.error('Error refreshing game:', err);
      setError('No se pudieron actualizar los precios. Inténtalo de nuevo.');
    } finally {
      setRefreshingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleRefreshAll = async () => {
    try {
      setIsRefreshingAll(true);
      const res = await fetch('/api/games/refresh-all', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updatedGames: TrackedGame[] = await res.json();
      setGames(updatedGames);
    } catch (err) {
      console.error('Error refreshing all games:', err);
      setError('No se pudieron actualizar todos los precios. Inténtalo de nuevo.');
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const selectedGame = games.find((g) => g.id === selectedGameId) || null;

  // Filter and sort games
  const filteredGames = games
    .filter((g) => g.title.toLowerCase().includes(searchFilter.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'lowest') {
        // Games without a known price (0) go last instead of first
        if (!a.lowestPrice || !b.lowestPrice) return (b.lowestPrice ? 1 : 0) - (a.lowestPrice ? 1 : 0);
        return a.lowestPrice - b.lowestPrice;
      }
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        totalGames={games.length}
        onRefreshAll={handleRefreshAll}
        isRefreshingAll={isRefreshingAll}
      />

      {/* Main layout with Left Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* LEFT SIDEBAR (Shows detailed price comparison ordered ascending when a game is selected) */}
        <Sidebar
          game={selectedGame}
          onClose={() => setSelectedGameId(null)}
          onRefreshGame={handleRefreshGame}
          isRefreshing={selectedGameId ? refreshingIds.has(selectedGameId) : false}
        />

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
          {/* Top Search bar */}
          <div className="space-y-3">
            <SearchBar onAddGame={handleAddGame} isAdding={isAdding} />

            {error && (
              <div
                role="alert"
                className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  title="Cerrar aviso"
                  className="p-1 rounded-lg text-rose-300 hover:text-white hover:bg-rose-900/50 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Region & Security Guarantees notice banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-emerald-950/40 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  <strong>Solo Claves Digitales:</strong> Sistema protegido contra cuentas de Steam compartidas.
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Globe className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>
                  <strong>Región: España</strong> (incluye claves España 🇪🇸, Europa 🇪🇺 y Global 🌐).
                </span>
              </div>
            </div>
          </div>

          {/* Watchlist Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2 m-0">
                <Gamepad2 className="w-5 h-5 text-emerald-400" />
                <span>Juegos en Seguimiento</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {games.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Mostrando el precio más bajo detectado y la tienda a la que pertenece.
              </p>
            </div>

            {/* Controls: Search filter & Sort */}
            {games.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search within tracked list */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrar lista..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Sort selector */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-transparent text-slate-300 font-medium py-1 pr-2 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="recent" className="bg-slate-900">Más recientes</option>
                    <option value="lowest" className="bg-slate-900">Menor precio</option>
                    <option value="title" className="bg-slate-900">Alfabético</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Games list or Empty state */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Cargando lista de juegos guardados...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Tag className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-lg font-bold text-white">Tu lista de seguimiento está vacía</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Utiliza el buscador superior para agregar cualquier juego. La app rastreará en tiempo real las mejores ofertas de claves en euros en los principales portales.
                </p>
              </div>

              {/* Quick suggestions */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                  O prueba a agregar uno de estos:
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[
                    { title: 'Elden Ring', steamAppId: 1245620 },
                    { title: 'Cyberpunk 2077', steamAppId: 1091500 },
                    { title: 'Baldur\'s Gate 3', steamAppId: 1086940 },
                    { title: 'Grand Theft Auto V', steamAppId: 271590 },
                    { title: 'Red Dead Redemption 2', steamAppId: 1174180 },
                  ].map((sug) => (
                    <button
                      key={sug.title}
                      type="button"
                      onClick={() => handleAddGame(sug)}
                      disabled={isAdding}
                      className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs text-slate-300 hover:text-white transition flex items-center gap-1.5"
                    >
                      <span>+ {sug.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs">
              No se encontraron juegos que coincidan con el filtro "{searchFilter}".
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  isSelected={game.id === selectedGameId}
                  onSelect={(g) => handleSelectGame(g.id)}
                  onDelete={handleDeleteGame}
                  onRefresh={handleRefreshGame}
                  isRefreshing={refreshingIds.has(game.id)}
                />
              ))}
            </div>
          )}

          {/* Footer note */}
          <footer className="pt-8 pb-4 text-center border-t border-slate-900 text-slate-500 text-xs space-y-1">
            <p>
              Precios rastreados en tiempo real en Euros (€) con filtrado de claves para España y Europa.
            </p>
            <p className="text-[11px] text-slate-600">
              Persistencia guardada automáticamente en base de datos SQLite local.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
