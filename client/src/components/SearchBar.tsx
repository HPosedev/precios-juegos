import React, { useState, useEffect, useRef } from 'react';
import type { SearchGameResult } from '../types';
import { Search, Plus, Loader2, X, Gamepad2, Sparkles } from 'lucide-react';

interface SearchBarProps {
  onAddGame: (game: { title: string; imageUrl?: string; steamAppId?: number | null }) => Promise<void>;
  isAdding: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onAddGame, isAdding }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchGameResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced live search. Stale requests are aborted so an older, slower
  // response can never overwrite the results of the latest query.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Search error:', err);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
    }
  };

  const clearSearch = () => handleQueryChange('');

  const handleSelectGame = async (game: SearchGameResult) => {
    clearSearch();
    await onAddGame({
      title: game.title,
      imageUrl: game.imageUrl,
      steamAppId: game.steamAppId,
    });
  };

  const handleSubmitCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    clearSearch();
    await onAddGame({ title: trimmed });
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmitCustom} className="relative">
        <div className="relative flex items-center">
          <div className="absolute left-4 text-slate-400 pointer-events-none">
            {isLoading || isAdding ? (
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
            placeholder="Buscar juego para añadir (ej: Elden Ring, Cyberpunk 2077, God of War...)"
            className="w-full pl-12 pr-28 py-3.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition shadow-xl shadow-black/20"
          />

          {query && (
            <button
              type="button"
              onClick={clearSearch}
              title="Limpiar búsqueda"
              className="absolute right-24 p-1 rounded-full text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={!query.trim() || isAdding}
            className="absolute right-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir</span>
          </button>
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl shadow-black/50 overflow-hidden max-h-96 overflow-y-auto">
          <div className="p-2 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Resultados encontrados</span>
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3" /> Claves legítimas
            </span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {results.map((r) => (
              <div
                key={r.id}
                onClick={() => handleSelectGame(r)}
                className="flex items-center justify-between p-3 hover:bg-slate-800/70 cursor-pointer transition group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  {r.imageUrl ? (
                    <img
                      src={r.imageUrl}
                      alt={r.title}
                      className="w-16 h-10 object-cover rounded-lg bg-slate-800 flex-shrink-0 border border-slate-700/50"
                    />
                  ) : (
                    <div className="w-16 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                      <Gamepad2 className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-100 group-hover:text-emerald-400 truncate transition">
                      {r.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {r.source}
                      </span>
                      {r.samplePrice !== undefined && (
                        <span className="text-emerald-400 font-medium">
                          Ref: ~{r.samplePrice.toFixed(2)} €
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="flex-shrink-0 p-2 rounded-xl bg-slate-800 group-hover:bg-emerald-500 text-slate-300 group-hover:text-slate-950 transition font-bold text-xs flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Seguir</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
