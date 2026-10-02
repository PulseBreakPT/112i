import { getTimeThemeSnapshot, solarTimesFor } from './timeTheme';

const minutes = date => date.getUTCHours() * 60 + date.getUTCMinutes();

test('Faro winter solar times match the expected late-December window', () => {
  const times = solarTimesFor(new Date('2026-12-21T12:00:00Z'), 37.0194, -7.9304, 'Europe/Lisbon');
  expect(minutes(times.sunrise)).toBeGreaterThanOrEqual(458);
  expect(minutes(times.sunrise)).toBeLessThanOrEqual(466);
  expect(minutes(times.sunset)).toBeGreaterThanOrEqual(1035);
  expect(minutes(times.sunset)).toBeLessThanOrEqual(1043);
  expect(minutes(times.dusk)).toBeGreaterThanOrEqual(1064);
  expect(minutes(times.dusk)).toBeLessThanOrEqual(1072);
});

test('auto theme is night after civil dusk in Faro', () => {
  const theme = getTimeThemeSnapshot(new Date('2026-12-21T19:00:00Z'), { lat: 37.0194, lng: -7.9304, city: 'Faro', land: 'mainland' }, 'auto');
  expect(theme.phase).toBe('night');
  expect(theme.dark).toBe(true);
});

test('manual preview ignores current solar phase', () => {
  const theme = getTimeThemeSnapshot(new Date('2026-12-21T23:00:00Z'), { lat: 37.0194, lng: -7.9304, city: 'Faro', land: 'mainland' }, 'morning');
  expect(theme.phase).toBe('morning');
  expect(theme.label).toBe('Manhã');
});
