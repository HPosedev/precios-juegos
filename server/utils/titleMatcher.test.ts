import { describe, expect, test } from 'bun:test';
import { cleanTitleForMatching, isConsoleOnlyProduct, isExactGameMatch } from './titleMatcher';

describe('cleanTitleForMatching', () => {
  test('removes store, key and edition noise', () => {
    expect(cleanTitleForMatching('ELDEN RING Deluxe Edition (PC) Steam CD Key EU')).toBe('elden ring');
  });

  test('converts Roman numerals', () => {
    expect(cleanTitleForMatching('Hades II')).toBe('hades 2');
    expect(cleanTitleForMatching('Grand Theft Auto V')).toBe('grand theft auto 5');
  });
});

describe('isExactGameMatch', () => {
  test('matches the same game across stores', () => {
    expect(isExactGameMatch('Elden Ring', 'ELDEN RING Steam CD Key')).toBe(true);
    expect(isExactGameMatch("Baldur's Gate 3", "Baldur's Gate 3 (PC) Steam Key GLOBAL")).toBe(true);
    expect(isExactGameMatch('Hades 2', 'Hades II')).toBe(true);
  });

  test('rejects sequels and prequels', () => {
    expect(isExactGameMatch('Hades', 'Hades II')).toBe(false);
    expect(isExactGameMatch('Hades 2', 'Hades')).toBe(false);
    expect(isExactGameMatch('Red Dead Redemption 2', 'Red Dead Redemption')).toBe(false);
  });

  test('rejects different games that share words', () => {
    expect(isExactGameMatch('Hades', 'H.A.D.E.S. Zero')).toBe(false);
    expect(isExactGameMatch('Cyberpunk 2077', 'Cyberpunk 2077 Phantom Liberty')).toBe(false);
  });

  test('rejects DLCs and passes sold under the base title', () => {
    expect(isExactGameMatch('Cyberpunk 2077', 'Cyberpunk 2077 DLC')).toBe(false);
    expect(isExactGameMatch('Elden Ring', 'Elden Ring Pass')).toBe(false);
  });
});

describe('isConsoleOnlyProduct', () => {
  test('flags console keys for a PC title', () => {
    expect(isConsoleOnlyProduct('Elden Ring', 'ELDEN RING Xbox Series X|S CD Key')).toBe(true);
    expect(isConsoleOnlyProduct('Elden Ring', 'Elden Ring (PS5)')).toBe(true);
    expect(isConsoleOnlyProduct('Elden Ring', 'Elden Ring', 'Nintendo eShop')).toBe(true);
  });

  test('keeps PC keys', () => {
    expect(isConsoleOnlyProduct('Elden Ring', 'ELDEN RING Steam CD Key', 'Steam')).toBe(false);
    expect(isConsoleOnlyProduct('Elden Ring', 'Elden Ring', '')).toBe(false);
  });

  test('does not filter when the tracked title itself names a console', () => {
    expect(isConsoleOnlyProduct('Xbox Game Pass Ultimate', 'Xbox Game Pass Ultimate 3 Months')).toBe(false);
  });
});
