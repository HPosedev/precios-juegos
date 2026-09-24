import type { GameOffer, SearchGameResult } from '../types';
import { getInstantGamingOffers, searchInstantGaming } from './instantGaming';
import { getKinguinOffers, searchKinguin } from './kinguin';
import { getCheapSharkOffers } from './cheapshark';
import { getSteamOfficialOffer, searchSteam } from './steam';
import { isExactGameMatch } from '../utils/titleMatcher';

export async function searchAllGames(query: string): Promise<SearchGameResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const [steamResults, igResults, kinguinResults] = await Promise.all([
    searchSteam(cleanQuery).catch(() => []),
    searchInstantGaming(cleanQuery).catch(() => []),
    searchKinguin(cleanQuery).catch(() => []),
  ]);

  const map = new Map<string, SearchGameResult>();

  // Prioritize Steam for official titles and high quality cover art
  for (const item of steamResults) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    map.set(key, item);
  }

  // Add Instant Gaming hits if they match query
  for (const item of igResults) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!map.has(key)) {
      map.set(key, item);
    } else {
      const existing = map.get(key)!;
      if (!existing.samplePrice && item.samplePrice) {
        existing.samplePrice = item.samplePrice;
      }
      if (!existing.imageUrl && item.imageUrl) {
        existing.imageUrl = item.imageUrl;
      }
    }
  }

  // Add Kinguin hits
  for (const item of kinguinResults) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values()).slice(0, 15);
}

export async function aggregateGamePrices(
  title: string,
  steamAppId?: number | null,
  currentImageUrl?: string
): Promise<{
  offers: GameOffer[];
  lowestOffer: GameOffer | null;
  officialPrice?: number;
  steamAppId?: number;
  imageUrl: string;
}> {
  // Fetch from all sources in parallel
  const [steamData, igOffers, kinguinOffers, csOffers] = await Promise.all([
    getSteamOfficialOffer(title, steamAppId).catch(() => ({ offer: null })),
    getInstantGamingOffers(title).catch(() => []),
    getKinguinOffers(title).catch(() => []),
    getCheapSharkOffers(title).catch(() => []),
  ]);

  const allOffers: GameOffer[] = [];

  if (steamData.offer) {
    allOffers.push(steamData.offer);
  }
  allOffers.push(...igOffers);
  allOffers.push(...kinguinOffers);
  allOffers.push(...csOffers);

  // STRICT VALIDATIONS:
  // 1. Must NOT be an account (isAccount === false)
  // 2. Must be Spain-compatible ('España', 'Europa', 'Global')
  // 3. Price must be valid
  const validOffers = allOffers.filter((o) => {
    if (o.isAccount) return false;
    if (o.price <= 0 || o.price >= 1000) return false;
    const reg = (o.region || '').toLowerCase();
    const isAllowedRegion =
      reg.includes('españa') ||
      reg.includes('europa') ||
      reg.includes('global') ||
      reg.includes('spain') ||
      reg.includes('europe');
    return isAllowedRegion;
  });

  // Deduplicate
  const uniqueOffers: GameOffer[] = [];
  const seen = new Set<string>();

  for (const offer of validOffers) {
    const key = `${offer.store}-${offer.price.toFixed(2)}-${offer.keyType}-${offer.inStock}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueOffers.push(offer);
    }
  }

  // Sort: IN-STOCK FIRST (sorted ascending by price), then OUT-OF-STOCK (sorted ascending by price)
  uniqueOffers.sort((a, b) => {
    if (a.inStock === b.inStock) {
      return a.price - b.price;
    }
    return a.inStock ? -1 : 1;
  });

  const inStockOffers = uniqueOffers.filter((o) => o.inStock);
  const lowestOffer = inStockOffers.length > 0 ? inStockOffers[0] : (uniqueOffers[0] || null);

  const resolvedImageUrl =
    steamData.imageUrl ||
    currentImageUrl ||
    (steamData.steamAppId
      ? `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${steamData.steamAppId}/header.jpg`
      : '');

  return {
    offers: uniqueOffers,
    lowestOffer,
    officialPrice: steamData.officialPrice,
    steamAppId: steamData.steamAppId ?? steamAppId ?? undefined,
    imageUrl: resolvedImageUrl,
  };
}
