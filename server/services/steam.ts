import type { GameOffer, SearchGameResult } from '../types';

export async function searchSteam(query: string): Promise<SearchGameResult[]> {
  try {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
      query
    )}&l=spanish&cc=es`;
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) return [];
    const data = (await response.json()) as any;
    const items = data.items || [];

    return items.map((item: any) => {
      const priceCents = item.price ? item.price.final : null;
      return {
        id: `steam-${item.id}`,
        title: item.name,
        imageUrl: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${item.id}/header.jpg`,
        steamAppId: item.id,
        source: 'Steam Store',
        samplePrice: priceCents ? priceCents / 100 : undefined,
      };
    });
  } catch (error) {
    console.error('Error searching Steam:', error);
    return [];
  }
}

export async function getSteamOfficialOffer(
  title: string,
  steamAppId?: number | null
): Promise<{ offer: GameOffer | null; officialPrice?: number; steamAppId?: number; imageUrl?: string }> {
  try {
    let appId = steamAppId;

    if (!appId) {
      const searchResults = await searchSteam(title);
      if (searchResults.length > 0) {
        appId = searchResults[0].steamAppId ?? undefined;
      }
    }

    if (!appId) {
      return { offer: null };
    }

    const appDetailsUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=es&l=spanish`;
    const response = await fetch(appDetailsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) return { offer: null };
    const json = (await response.json()) as any;
    const appData = json[appId]?.data;
    if (!appData) return { offer: null };

    const priceOverview = appData.price_overview;
    const priceEur = priceOverview ? priceOverview.final / 100 : (appData.is_free ? 0 : null);
    const initialPriceEur = priceOverview ? priceOverview.initial / 100 : undefined;

    const offer: GameOffer | null = priceEur !== null ? {
      id: `steam-official-${appId}`,
      store: 'Steam Store (Oficial)',
      storeCategory: 'official',
      price: priceEur,
      originalPrice: initialPriceEur && initialPriceEur > priceEur ? initialPriceEur : undefined,
      currency: 'EUR',
      region: 'España',
      keyType: 'Steam Key',
      url: `https://store.steampowered.com/app/${appId}/`,
      isAccount: false,
      inStock: true,
      notes: 'Tienda Oficial Steam España',
    } : null;

    return {
      offer,
      officialPrice: initialPriceEur || priceEur || undefined,
      steamAppId: appId,
      imageUrl: appData.header_image,
    };
  } catch (error) {
    console.error('Error fetching Steam official offer:', error);
    return { offer: null };
  }
}
