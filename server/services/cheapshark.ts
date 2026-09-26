import type { GameOffer } from '../types';
import { isExactGameMatch } from '../utils/titleMatcher';

const STORE_NAMES: Record<string, string> = {
  '1': 'Steam Store',
  '2': 'GamersGate',
  '3': 'GreenManGaming',
  '7': 'GOG.com',
  '11': 'Humble Store',
  '13': 'Ubisoft Connect',
  '15': 'Fanatical',
  '21': 'WinGameStore',
  '23': 'GameBillet',
  '25': 'Epic Games Store',
  '27': 'Gamesplanet',
  '28': 'Gamesload',
  '30': 'IndieGala',
  '35': 'DreamGame',
};

// CheapShark only reports US prices; this fixed rate gives an approximate EUR figure
const USD_TO_EUR_RATE = 0.92;

export async function getCheapSharkOffers(title: string): Promise<GameOffer[]> {
  try {
    const searchUrl = `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(title)}&limit=8`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'GameKeyTrackerES/1.0 (contact@preciosjuegos.es)' },
      signal: AbortSignal.timeout(6000),
    });

    if (!searchRes.ok) return [];
    const games = (await searchRes.json()) as any[];
    if (!games || games.length === 0) return [];

    // Find strictly matching game
    let matchedGame = null;
    for (const g of games) {
      if (isExactGameMatch(title, g.external || '')) {
        matchedGame = g;
        break;
      }
    }

    if (!matchedGame || !matchedGame.gameID) return [];
    const gameId = matchedGame.gameID;

    const dealsUrl = `https://www.cheapshark.com/api/1.0/games?id=${gameId}`;
    const dealsRes = await fetch(dealsUrl, {
      headers: { 'User-Agent': 'GameKeyTrackerES/1.0 (contact@preciosjuegos.es)' },
      signal: AbortSignal.timeout(6000),
    });

    if (!dealsRes.ok) return [];
    const dealsData = (await dealsRes.json()) as any;
    const deals = dealsData.deals || [];

    const offers: GameOffer[] = [];

    for (const deal of deals) {
      const storeName = STORE_NAMES[deal.storeID] || `Tienda #${deal.storeID}`;
      if (deal.storeID === '1') continue; // Steam official is queried directly

      const priceUsd = parseFloat(deal.price);
      if (isNaN(priceUsd) || priceUsd <= 0) continue;

      const priceEur = Math.round(priceUsd * USD_TO_EUR_RATE * 100) / 100;
      const retailUsd = parseFloat(deal.retailPrice);
      const retailEur = !isNaN(retailUsd) ? Math.round(retailUsd * USD_TO_EUR_RATE * 100) / 100 : undefined;

      let keyType: GameOffer['keyType'] = 'Steam Key';
      if (deal.storeID === '7') keyType = 'GOG Key';
      else if (deal.storeID === '25') keyType = 'Epic Key';
      else if (deal.storeID === '13') keyType = 'Ubisoft Connect';

      offers.push({
        id: `cs-${deal.dealID}`,
        store: storeName,
        storeCategory: 'keyshop',
        price: priceEur,
        originalPrice: retailEur && retailEur > priceEur ? retailEur : undefined,
        currency: 'EUR',
        region: 'Global',
        keyType,
        url: `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`,
        isAccount: false,
        inStock: true,
        notes: 'Distribuidor oficial autorizado · precio aproximado (convertido desde USD)',
      });
    }

    return offers;
  } catch (error) {
    console.error('Error fetching CheapShark deals:', error);
    return [];
  }
}
