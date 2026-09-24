import React, { useState } from 'react';
import type { TrackedGame, GameOffer } from '../types';
import {
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  X,
  Sparkles,
  Globe,
  Tag,
  CheckCircle2,
  TrendingDown,
  Info,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SidebarProps {
  game: TrackedGame | null;
  onClose: () => void;
  onRefreshGame: (id: string) => Promise<void>;
  isRefreshing: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  game,
  onClose,
  onRefreshGame,
  isRefreshing,
}) => {
  const [showOutOfStock, setShowOutOfStock] = useState(true);

  if (!game) {
    return (
      <aside className="w-full lg:w-[420px] lg:flex-shrink-0 bg-slate-900/95 backdrop-blur border-r border-slate-800 p-6 flex flex-col items-center justify-center text-center min-h-[600px] lg:min-h-screen">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-4 shadow-lg shadow-black/20">
          <Tag className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200 mb-2">
          Ningún juego seleccionado
        </h3>
        <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
          Haz clic en cualquier juego de la lista para ver la comparativa completa de todos los portales ordenados de menor a mayor.
        </p>
        <div className="mt-6 p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400 text-left space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>Filtro de seguridad activo</span>
          </div>
          <p className="text-slate-400">
            Se excluyen automáticamente ofertas de <strong>cuentas de Steam</strong>. Solo verás claves digitales legítimas activables en España.
          </p>
        </div>
      </aside>
    );
  }

  // Separate in-stock and out-of-stock offers
  const inStockOffers = game.offers.filter((o) => o.inStock).sort((a, b) => a.price - b.price);
  const outOfStockOffers = game.offers.filter((o) => !o.inStock).sort((a, b) => a.price - b.price);

  // The actual best buyable offer must be in stock if available!
  const bestOffer = inStockOffers.length > 0 ? inStockOffers[0] : (outOfStockOffers[0] || null);
  const officialPrice = game.officialPrice || 0;
  const maxSavings =
    officialPrice && bestOffer && bestOffer.inStock
      ? Math.max(0, Math.round(((officialPrice - bestOffer.price) / officialPrice) * 100))
      : 0;

  const getStoreBadgeColor = (store: string) => {
    const s = store.toLowerCase();
    if (s.includes('instant')) return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    if (s.includes('kinguin')) return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    if (s.includes('steam')) return 'bg-blue-600/10 text-blue-400 border-blue-500/30';
    if (s.includes('greenman')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (s.includes('fanatical')) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (s.includes('gog')) return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    if (s.includes('humble')) return 'bg-red-500/10 text-red-400 border-red-500/30';
    return 'bg-slate-700/30 text-slate-300 border-slate-700';
  };

  const getRegionIcon = (region: string) => {
    const r = region.toLowerCase();
    if (r.includes('españa') || r.includes('spain')) return '🇪🇸';
    if (r.includes('europa') || r.includes('europe')) return '🇪🇺';
    return '🌐';
  };

  const renderOfferCard = (offer: GameOffer, index: number, isOutOfStock = false) => {
    const isBest = !isOutOfStock && index === 0;

    return (
      <div
        key={offer.id || `${offer.store}-${index}`}
        className={`relative p-3.5 rounded-xl border transition-all duration-200 ${
          isBest
            ? 'bg-gradient-to-r from-emerald-950/40 to-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30'
            : isOutOfStock
            ? 'bg-slate-900/40 border-slate-800/80 opacity-75 hover:opacity-100'
            : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-700/60'
        }`}
      >
        {isBest && (
          <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
            <Sparkles className="w-3 h-3" />
            Mejor Precio Disponible
          </div>
        )}

        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {!isOutOfStock && <span className="text-xs font-bold text-slate-500">#{index + 1}</span>}
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold border ${getStoreBadgeColor(
                offer.store
              )}`}
            >
              {offer.store}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-medium">
              {offer.keyType}
            </span>
            {isOutOfStock && (
              <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                Agotado
              </span>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            <span
              className={`text-lg font-black block leading-none ${
                isBest
                  ? 'text-emerald-400'
                  : isOutOfStock
                  ? 'text-slate-400'
                  : 'text-slate-100'
              }`}
            >
              {offer.price.toFixed(2)} €
            </span>
            {offer.originalPrice && offer.originalPrice > offer.price && (
              <span className="text-[11px] text-slate-500 line-through">
                {offer.originalPrice.toFixed(2)} €
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-700/40 text-[11px]">
          <div className="flex items-center gap-2 text-slate-400">
            <span title={`Región: ${offer.region}`}>
              {getRegionIcon(offer.region)} {offer.region}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Clave Digital
            </span>
          </div>

          <a
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition ${
              isBest
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow'
                : isOutOfStock
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
          >
            <span>{isOutOfStock ? 'Ver en tienda' : 'Comprar clave'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {offer.notes && (
          <p className="text-[10px] text-slate-500 mt-1.5 truncate">
            {offer.notes}
          </p>
        )}
      </div>
    );
  };

  return (
    <aside className="w-full lg:w-[440px] lg:flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-full lg:min-h-screen overflow-y-auto">
      {/* Header with image */}
      <div className="relative w-full h-48 bg-slate-950 flex-shrink-0 overflow-hidden border-b border-slate-800">
        {game.imageUrl ? (
          <img
            src={game.imageUrl}
            alt={game.title}
            className="w-full h-full object-cover object-center brightness-90 contrast-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950 text-slate-500">
            <Tag className="w-12 h-12" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

        {/* Action buttons over header */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={() => onRefreshGame(game.id)}
            disabled={isRefreshing}
            title="Actualizar precios ahora"
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition shadow"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={onClose}
            title="Cerrar detalle"
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition shadow"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title over header */}
        <div className="absolute bottom-3 left-4 right-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Claves Verificadas
            </span>
            {game.steamAppId && (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Steam ID: {game.steamAppId}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-white leading-tight drop-shadow-md">
            {game.title}
          </h2>
        </div>
      </div>

      {/* Main sidebar content */}
      <div className="p-4 space-y-4 flex-1">
        {/* Price highlights summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
            <span className="text-xs text-emerald-400/80 block font-medium">
              {bestOffer && bestOffer.inStock ? 'Mejor Precio Disponible' : 'Último Precio Visto'}
            </span>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">
              {bestOffer ? `${bestOffer.price.toFixed(2)} €` : 'N/D'}
            </div>
            <span className="text-[11px] text-slate-400 truncate block mt-0.5">
              En {bestOffer ? bestOffer.store : '-'} {bestOffer && !bestOffer.inStock ? '(Sin stock)' : ''}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-xs text-slate-400 block font-medium">Precio Oficial (Steam)</span>
            <div className="text-2xl font-black text-slate-200 mt-0.5">
              {officialPrice ? `${officialPrice.toFixed(2)} €` : 'N/D'}
            </div>
            {maxSavings > 0 ? (
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold mt-0.5">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Ahorras hasta un {maxSavings}%</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 block mt-0.5">Precio de referencia</span>
            )}
          </div>
        </div>

        {/* Guarantees & Region note */}
        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>Garantía: Sin cuentas de Steam</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Solo se comparan <strong>claves de activación digital</strong> (Steam, GOG, Epic, etc.). Se descartan perfiles y cuentas compartidas.
          </p>
          <div className="pt-1 flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>Región España (incluye claves España, Europa y Global).</span>
          </div>
        </div>

        {/* Section title: In-Stock Offers */}
        <div className="flex items-center justify-between pt-1">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <span>Precios disponibles (en stock)</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
              {inStockOffers.length}
            </span>
          </h3>
          <span className="text-[11px] text-slate-500">De menor a mayor</span>
        </div>

        {/* In-Stock Offers list */}
        {inStockOffers.length === 0 ? (
          <div className="p-5 rounded-xl bg-slate-800/30 border border-dashed border-slate-700 text-center text-slate-400 text-xs space-y-1">
            <AlertCircle className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="font-semibold text-slate-300">No hay stock disponible actualmente</p>
            <p className="text-[11px]">Las tiendas rastreadas han agotado sus existencias momentáneamente.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {inStockOffers.map((offer, index) => renderOfferCard(offer, index, false))}
          </div>
        )}

        {/* Out-Of-Stock Offers Section */}
        {outOfStockOffers.length > 0 && (
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowOutOfStock(!showOutOfStock)}
                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition"
              >
                <span>Agotados / Sin stock ({outOfStockOffers.length})</span>
                {showOutOfStock ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <span className="text-[10px] text-slate-500">Últimos precios registrados</span>
            </div>

            {showOutOfStock && (
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-500 leading-snug">
                  Estas tiendas ofrecen este juego pero han agotado sus claves temporalmente:
                </p>
                {outOfStockOffers.map((offer, index) => renderOfferCard(offer, index, true))}
              </div>
            )}
          </div>
        )}

        {/* Quick direct search links to other major portals */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>Accesos directos a otros portales de claves</span>
          </div>
          <p className="text-[11px] text-slate-500 mb-3">
            Consulta también el catálogo de otros proveedores para comparar:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://www.eneba.com/store/all?text=${encodeURIComponent(game.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 transition"
            >
              <span>Buscar en Eneba</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
            <a
              href={`https://www.g2a.com/search?query=${encodeURIComponent(game.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 transition"
            >
              <span>Buscar en G2A</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
            <a
              href={`https://www.cdkeys.com/es_es/catalogsearch/result/?q=${encodeURIComponent(game.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 transition"
            >
              <span>Buscar en CDKeys</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
            <a
              href={`https://www.gamivo.com/search/${encodeURIComponent(game.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 transition"
            >
              <span>Buscar en Gamivo</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
};
