import type { GameOffer, SearchGameResult } from '../types';
import { isConsoleOnlyProduct, isExactGameMatch } from '../utils/titleMatcher';

const KINGUIN_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
};

async function fetchKinguinProducts(phrase: string): Promise<any[]> {
  const url = `https://www.kinguin.net/services/library/api/v1/products/search?phrase=${encodeURIComponent(
    phrase
  )}&size=15`;
  const response = await fetch(url, { headers: KINGUIN_HEADERS, signal: AbortSignal.timeout(6000) });
  if (!response.ok) return [];
  const data = (await response.json()) as any;
  return data?._embedded?.products || [];
}

const ACCOUNT_AND_ITEM_PATTERNS = [
  /account/i,
  /cuenta/i,
  /cuentas/i,
  /perfil/i,
  /profile/i,
  /family\s*sharing/i,
  /shared/i,
  /offline\s*play/i,
  /offline/i,
  /user\s*\+\s*pass/i,
  /login/i,
  /acceso/i,
  // Items, boosting, currency (not full games)
  /\bitem\b/i,
  /\bitems\b/i,
  /\bboosting\b/i,
  /\bboost\b/i,
  /\brunes\b/i,
  /\bcurrency\b/i,
  /\bgold\b/i,
  /\bcoins\b/i,
  /\bbonus\s*gesture\b/i,
];

export async function searchKinguin(query: string): Promise<SearchGameResult[]> {
  try {
    const products = await fetchKinguinProducts(`${query} Key`);

    const results: SearchGameResult[] = [];

    for (const p of products) {
      const name = p.name || '';
      const isInvalid =
        p.marketingProductType === 'INGAME_ACCOUNT' ||
        p.deliveryKeyTypeId === '11' ||
        ACCOUNT_AND_ITEM_PATTERNS.some((pat) => pat.test(name));

      if (isInvalid) continue;

      const lowestPriceCents = p.price?.lowestOffer;
      if (!lowestPriceCents || lowestPriceCents >= 90000) continue;

      results.push({
        id: `kinguin-${p.id}`,
        title: cleanKinguinTitle(name),
        imageUrl: p.hiImageUrl || p.imageUrl || '',
        source: 'Kinguin',
        samplePrice: lowestPriceCents / 100,
      });
    }

    return results;
  } catch (error) {
    console.error('Error searching Kinguin:', error);
    return [];
  }
}

export async function getKinguinOffers(title: string): Promise<GameOffer[]> {
  try {
    // Generate query variants (e.g. 'Hades 2' -> also try 'Hades II')
    const phrases = [`${title} Key`];
    if (/\b2\b/.test(title)) {
      phrases.push(`${title.replace(/\b2\b/g, 'II')} Key`);
    } else if (/\bii\b/i.test(title)) {
      phrases.push(`${title.replace(/\bii\b/gi, '2')} Key`);
    }
    phrases.push(`${title} Steam`, `${title} GOG`);

    const offers: GameOffer[] = [];
    const seenIds = new Set<string>();

    // Query variants run in parallel; a failing variant doesn't discard the others
    const productLists = await Promise.all(
      phrases.map((phrase) =>
        fetchKinguinProducts(phrase).catch((err) => {
          console.error(`Error fetching Kinguin results for "${phrase}":`, err);
          return [];
        })
      )
    );

    for (const products of productLists) {
      for (const p of products) {
        if (seenIds.has(p.id)) continue;
        const name = p.name || '';

        // STRICT TITLE MATCH: (Eliminates H.A.D.E.S. Zero, sequel mixups, etc.)
        if (!isExactGameMatch(title, name)) {
          continue;
        }

        // PC only: skip Xbox / PlayStation / Switch keys
        if (isConsoleOnlyProduct(title, name, p.platform || '')) {
          continue;
        }

        // STRICT ACCOUNT & IN-GAME ITEM EXCLUSION:
        const isInvalid =
          p.marketingProductType === 'INGAME_ACCOUNT' ||
          p.deliveryKeyTypeId === '11' ||
          ACCOUNT_AND_ITEM_PATTERNS.some((pat) => pat.test(name)) ||
          ACCOUNT_AND_ITEM_PATTERNS.some((pat) => pat.test(p.keywords || ''));

        if (isInvalid) continue;

        // Check price
        const lowestOffer = p.price?.lowestOffer;
        // Kinguin sets lowestOffer = 1000000 (10,000€) when out of stock!
        if (!lowestOffer || lowestOffer >= 90000 || lowestOffer <= 0) {
          continue;
        }

        const priceEur = Math.round((lowestOffer / 100) * 100) / 100;

        // Region check: must be valid for Spain
        const reg = p.attributes?.region;
        const activationCountries = Array.isArray(reg?.activationCountries)
          ? reg.activationCountries
          : [];
        const excludedCountries = Array.isArray(reg?.excludedCountries)
          ? reg.excludedCountries
          : [];

        const nameUpper = name.toUpperCase();
        const isUsOnly =
          nameUpper.includes(' US ') ||
          nameUpper.includes(' USA ') ||
          nameUpper.includes('NORTH AMERICA') ||
          nameUpper.includes(' NA ');
        const isLatam = nameUpper.includes('LATAM') || nameUpper.includes('ARGENTINA');
        const isAsia = nameUpper.includes(' ASIA ') || nameUpper.includes(' RU/CIS ');

        if (isUsOnly || isLatam || isAsia) continue;
        if (excludedCountries.includes('ES')) continue;

        let isSpainAllowed = false;
        let regionLabel: 'España' | 'Europa' | 'Global' = 'Europa';

        if (activationCountries.length > 0) {
          if (activationCountries.includes('ES')) {
            isSpainAllowed = true;
            if (activationCountries.length > 150) regionLabel = 'Global';
            else regionLabel = 'Europa';
          }
        } else {
          if (nameUpper.includes('GLOBAL') || nameUpper.includes('ROW')) {
            isSpainAllowed = true;
            regionLabel = 'Global';
          } else if (nameUpper.includes('EU') || nameUpper.includes('EUROPE')) {
            isSpainAllowed = true;
            regionLabel = 'Europa';
          } else if (!nameUpper.includes('ASIA') && !nameUpper.includes('LATAM')) {
            isSpainAllowed = true;
            regionLabel = 'Global';
          }
        }

        if (!isSpainAllowed) continue;

        let keyType: GameOffer['keyType'] = 'Steam Key';
        if (nameUpper.includes('GOG')) keyType = 'GOG Key';
        else if (nameUpper.includes('EPIC')) keyType = 'Epic Key';
        else if (/\b(EA|ORIGIN)\b/.test(nameUpper)) keyType = 'EA App Key';
        else if (nameUpper.includes('UBISOFT')) keyType = 'Ubisoft Connect';
        else if (!nameUpper.includes('STEAM')) keyType = 'Clave Digital';

        const cleaned = cleanKinguinTitle(name);
        const productUrl = p.urlKey
          ? `https://www.kinguin.net/category/${p.parentCategoryId || ''}/${p.urlKey}`
          : `https://www.kinguin.net/listing?phrase=${encodeURIComponent(cleaned)}`;

        seenIds.add(p.id);
        offers.push({
          id: `kinguin-${p.id}`,
          store: 'Kinguin',
          storeCategory: 'marketplace',
          price: priceEur,
          originalPrice: p.price?.market ? Math.round((p.price.market / 100) * 100) / 100 : undefined,
          currency: 'EUR',
          region: regionLabel,
          rawRegion: regionLabel,
          keyType,
          url: productUrl,
          isAccount: false,
          inStock: true,
          notes: `Marketplace Kinguin (Clave digital verificada, sin cuentas)`,
        });
      }
    }

    return offers;
  } catch (error) {
    console.error('Error fetching Kinguin offers:', error);
    return [];
  }
}

function cleanKinguinTitle(name: string): string {
  return name
    .replace(/\b(Steam\s*CD\s*Key|Steam\s*Key|EU\s*Steam\s*CD\s*Key|RoW\s*Steam\s*CD\s*Key|Digital\s*Key|code|PC\s*GOG\s*CD\s*Key|GOG\s*CD\s*Key)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}
