export interface GameOffer {
  id: string;
  store: string;
  storeCategory: 'marketplace' | 'keyshop' | 'official';
  price: number; // in EUR
  originalPrice?: number; // in EUR
  currency: 'EUR';
  region: 'España' | 'Europa' | 'Global';
  rawRegion?: string;
  keyType: 'Steam Key' | 'Clave Digital' | 'GOG Key' | 'Epic Key' | 'EA App Key' | 'Ubisoft Connect';
  url: string;
  isAccount: boolean; // Must be false to be shown
  inStock: boolean;
  notes?: string;
}

export interface TrackedGame {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  steamAppId?: number | null;
  addedAt: string;
  lastChecked: string;
  lowestPrice: number;
  lowestStore: string;
  lowestRegion: string;
  lowestUrl: string;
  lowestKeyType: string;
  officialPrice?: number;
  offers: GameOffer[];
}

export interface SearchGameResult {
  id: string;
  title: string;
  imageUrl: string;
  steamAppId?: number | null;
  instantGamingId?: number | null;
  source: string;
  samplePrice?: number;
}
