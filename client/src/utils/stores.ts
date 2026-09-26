export function getStoreBadgeColor(store: string): string {
  const s = (store || '').toLowerCase();
  if (s.includes('instant')) return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
  if (s.includes('kinguin')) return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
  if (s.includes('steam')) return 'bg-blue-600/15 text-blue-400 border-blue-500/30';
  if (s.includes('greenman')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (s.includes('fanatical')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  if (s.includes('gog')) return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  if (s.includes('humble')) return 'bg-red-500/15 text-red-400 border-red-500/30';
  return 'bg-slate-700/40 text-slate-300 border-slate-700';
}

export function getRegionIcon(region: string): string {
  const r = (region || '').toLowerCase();
  if (r.includes('españa') || r.includes('spain')) return '🇪🇸';
  if (r.includes('europa') || r.includes('europe')) return '🇪🇺';
  return '🌐';
}
