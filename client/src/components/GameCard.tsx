import React from 'react';
import type { TrackedGame } from '../types';
import {
  ExternalLink,
  Trash2,
  RefreshCw,
  Tag,
  ChevronRight,
  ShieldCheck,
  Globe,
  Layers,
} from 'lucide-react';

interface GameCardProps {
  game: TrackedGame;
  isSelected: boolean;
  onSelect: (game: TrackedGame) => void;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => Promise<void>;
  isRefreshing: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  isSelected,
  onSelect,
  onDelete,
  onRefresh,
  isRefreshing,
}) => {
  const getStoreBadgeColor = (store: string) => {
    const s = store.toLowerCase();
    if (s.includes('instant')) return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    if (s.includes('kinguin')) return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    if (s.includes('steam')) return 'bg-blue-600/15 text-blue-400 border-blue-500/30';
    if (s.includes('greenman')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (s.includes('fanatical')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    if (s.includes('gog')) return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    return 'bg-slate-700/40 text-slate-300 border-slate-700';
  };

  const getRegionIcon = (region: string) => {
    const r = (region || '').toLowerCase();
    if (r.includes('españa') || r.includes('spain')) return '🇪🇸';
    if (r.includes('europa') || r.includes('europe')) return '🇪🇺';
    return '🌐';
  };

  const bestPriceText = game.lowestPrice > 0 ? `${game.lowestPrice.toFixed(2)} €` : 'Consultar';

  return (
    <div
      onClick={() => onSelect(game)}
      className={`group relative bg-slate-900/90 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col sm:flex-row items-stretch ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl shadow-emerald-950/30'
          : 'border-slate-800 hover:border-slate-700/90 hover:shadow-xl hover:shadow-black/40'
      }`}
    >
      {/* Cover image banner */}
      <div className="relative w-full sm:w-56 h-36 sm:h-auto flex-shrink-0 bg-slate-950 overflow-hidden">
        {game.imageUrl ? (
          <img
            src={game.imageUrl}
            alt={game.title}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-300 brightness-95"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
            <Tag className="w-10 h-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 sm:bg-gradient-to-r sm:from-transparent sm:to-slate-900/80" />

        {/* Floating badge over image */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Clave Digital
          </span>
        </div>
      </div>

      {/* Main card details */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3 min-w-0">
        <div>
          {/* Top row: Title and delete/refresh buttons */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 pr-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-100 group-hover:text-emerald-400 transition truncate">
                {game.title}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-400">
                <span className="flex items-center gap-1" title="Región compatible">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    {getRegionIcon(game.lowestRegion)} {game.lowestRegion || 'Europa'}
                  </span>
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300 font-medium">
                  {game.lowestKeyType || 'Steam Key'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  {game.offers.length} {game.offers.length === 1 ? 'oferta' : 'ofertas'}
                </span>
              </div>
            </div>

            {/* Quick Actions: Refresh & Delete */}
            <div
              className="flex items-center gap-1 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onRefresh(game.id)}
                disabled={isRefreshing}
                title="Refrescar precios"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Eliminar "${game.title}" de tu lista de seguimiento?`)) {
                    onDelete(game.id);
                  }
                }}
                title="Borrar de la lista"
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom row: Lowest price & store badge & CTA */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Precio más bajo
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-emerald-400 leading-none">
                  {bestPriceText}
                </span>
                {game.officialPrice && game.officialPrice > game.lowestPrice && (
                  <span className="text-xs text-slate-500 line-through">
                    {game.officialPrice.toFixed(2)} €
                  </span>
                )}
              </div>
            </div>

            {/* Store Name Badge (e.g. Instant Gaming, Kinguin, Steam) */}
            <div className="hidden sm:block pl-2 border-l border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                Vendido por
              </span>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold border ${getStoreBadgeColor(
                  game.lowestStore
                )}`}
              >
                {game.lowestStore || 'Instant Gaming'}
              </span>
            </div>
          </div>

          {/* Buttons: Buy directly or inspect sidebar */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {game.lowestUrl && game.lowestUrl !== '#' && (
              <a
                href={game.lowestUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Comprar al mejor precio"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
              >
                <span>Comprar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              type="button"
              onClick={() => onSelect(game)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition shadow-md shadow-emerald-950/20"
            >
              <span>Ver ofertas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
