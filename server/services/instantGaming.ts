import type { GameOffer, SearchGameResult } from '../types';
import { isConsoleOnlyProduct, isExactGameMatch } from '../utils/titleMatcher';

const IG_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept-Language': 'es-ES,es;q=0.9',
};

async function fetchInstantGamingHits(query: string): Promise<any[]> {
  const url = `https://www.instant-gaming.com/es/busquedas/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: IG_HEADERS, signal: AbortSignal.timeout(6000) });
  if (!response.ok) return [];
  const html = await response.text();

  const match = html.match(/window\.searchResults\s*=\s*(\{.+?\});\s*(?:var|window|<\/script>)/s);
  if (!match) return [];

  const data = JSON.parse(match[1]);
  return data.hits || [];
}

export async function searchInstantGaming(query: string): Promise<SearchGameResult[]> {
  try {
    const hits = await fetchInstantGamingHits(query);

    return hits
      .filter((h: any) => h.prod_id && h.name && h.is_dlc === 0)
      .slice(0, 10)
      .map((h: any) => ({
        id: `ig-${h.prod_id}`,
        title: h.name,
        imageUrl: `https://gaming-cdn.com/images/products/${h.prod_id}/orig/${h.prod_id}.jpg`,
        instantGamingId: h.prod_id,
        source: 'Instant Gaming',
        samplePrice: h.price_eur ? parseFloat(h.price_eur) : parseFloat(h.price || '0'),
      }));
  } catch (error) {
    console.error('Error searching Instant Gaming:', error);
    return [];
  }
}

export async function getInstantGamingOffers(title: string): Promise<GameOffer[]> {
  try {
    // Generate query variants (e.g. if title is 'Hades 2', also try 'Hades II')
    const queries = [title];
    if (/\b2\b/.test(title)) {
      queries.push(title.replace(/\b2\b/g, 'II'));
    } else if (/\bii\b/i.test(title)) {
      queries.push(title.replace(/\bii\b/gi, '2'));
    }

    const offers: GameOffer[] = [];
    const seenProdIds = new Set<number>();

    // Query variants run in parallel; a failing variant doesn't discard the others
    const hitLists = await Promise.all(
      queries.map((q) =>
        fetchInstantGamingHits(q).catch((err) => {
          console.error(`Error fetching Instant Gaming results for "${q}":`, err);
          return [];
        })
      )
    );

    for (const hits of hitLists) {
      for (const h of hits) {
        if (seenProdIds.has(h.prod_id)) continue;

        const priceVal = h.price_eur ? parseFloat(h.price_eur) : parseFloat(h.price || '0');
        if (!priceVal || priceVal <= 0) continue;

        const hitName = h.name || h.fullname || '';

        // STRICT TITLE MATCH:
        if (!isExactGameMatch(title, hitName)) {
          continue;
        }

        // PC only: skip Xbox / PlayStation / Switch keys
        if (isConsoleOnlyProduct(title, hitName, h.platform || '', h.type || '')) {
          continue;
        }

        // Filter in-game items, currency, boost
        if (/\b(item|items|runes|currency|gold|coins|boosting|boost|points)\b/i.test(hitName)) {
          continue;
        }

        // Region check: Must be valid for Spain (Europe, Global, or ES in whitelist)
        const regionText = (h.region || h.region_fulltext || '').toLowerCase();
        const whitelist = Array.isArray(h.country_whitelist) ? h.country_whitelist : [];
        const isSpainValid =
          whitelist.includes('ES') ||
          regionText.includes('europe') ||
          regionText.includes('europa') ||
          regionText.includes('global') ||
          regionText.includes('worldwide');

        if (!isSpainValid) continue;

        let mappedRegion: 'España' | 'Europa' | 'Global' = 'Europa';
        if (regionText.includes('global') || regionText.includes('worldwide')) {
          mappedRegion = 'Global';
        } else if (regionText.includes('españa') || regionText.includes('spain')) {
          mappedRegion = 'España';
        }

        const platform = (h.platform || h.type || '').toLowerCase();
        const seoName = (h.seo_name || '').toLowerCase();

        let keyType: GameOffer['keyType'] = 'Steam Key';
        if (platform.includes('steam') || seoName.includes('steam')) {
          keyType = 'Steam Key';
        } else if (platform.includes('gog') || seoName.includes('gog')) {
          keyType = 'GOG Key';
        } else if (platform.includes('epic') || seoName.includes('epic')) {
          keyType = 'Epic Key';
        } else if (/\b(ea|origin)\b/i.test(platform) || /\b(ea[-_ ]app|origin)\b/i.test(seoName)) {
          keyType = 'EA App Key';
        } else if (platform.includes('ubisoft') || platform.includes('uplay')) {
          keyType = 'Ubisoft Connect';
        } else {
          keyType = 'Clave Digital';
        }

        seenProdIds.add(h.prod_id);
        offers.push({
          id: `ig-${h.prod_id}`,
          store: 'Instant Gaming',
          storeCategory: 'keyshop',
          price: priceVal,
          originalPrice: h.retail ? parseFloat(h.retail) : undefined,
          currency: 'EUR',
          region: mappedRegion,
          rawRegion: h.region_fulltext || h.region,
          keyType,
          url: `https://www.instant-gaming.com/es/${h.prod_id}-${h.seo_name || 'juego'}/`,
          isAccount: false,
          inStock: h.has_stock === 1,
          notes: h.has_stock === 1 ? (h.edition ? `Edición: ${h.edition}` : 'Clave digital verificada') : 'Agotado temporalmente en tienda',
        });
      }
    }

    return offers;
  } catch (error) {
    console.error('Error fetching Instant Gaming offers:', error);
    return [];
  }
}
