import React from 'react';
import { Gamepad2, ShieldCheck, RefreshCw } from 'lucide-react';

interface HeaderProps {
  totalGames: number;
  onRefreshAll: () => Promise<void>;
  isRefreshingAll: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  totalGames,
  onRefreshAll,
  isRefreshingAll,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-indigo-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white m-0">
                KeyRadar <span className="text-emerald-400">ES</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                España & Europa
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Rastreador en tiempo real de claves para juegos de PC (Euros €)
            </p>
          </div>
        </div>

        {/* Global actions & stats */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Filtro anti-cuentas activo</span>
          </div>

          <button
            type="button"
            onClick={onRefreshAll}
            disabled={isRefreshingAll || totalGames === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 disabled:opacity-50 disabled:pointer-events-none text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition shadow"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshingAll ? 'animate-spin text-emerald-400' : ''}`}
            />
            <span>{isRefreshingAll ? 'Actualizando...' : 'Actualizar todos'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
