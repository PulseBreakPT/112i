import { portugalTime, portugalShortTime, portugalHour, isPortugalNight, legacyRealTime } from './timeEngine';

test('Portugal time follows winter time and summer time automatically', () => {
  expect(portugalTime('2026-01-15T12:00:00.000Z')).toBe('12:00:00');
  expect(portugalTime('2026-07-15T12:00:00.000Z')).toBe('13:00:00');
});

test('Portugal hour drives day and night instead of simulation elapsed time', () => {
  expect(portugalHour('2026-07-15T21:15:00.000Z')).toBe(22);
  expect(isPortugalNight('2026-07-15T21:15:00.000Z')).toBe(true);
  expect(isPortugalNight('2026-07-15T11:15:00.000Z')).toBe(false);
});

test('legacy records are anchored to the real save timestamp', () => {
  expect(legacyRealTime('2026-10-02T10:00:00.000Z', 3600, 1800)).toBe('2026-10-02T09:30:00.000Z');
  expect(portugalShortTime('2026-10-02T09:30:00.000Z')).toMatch(/^10:30$/);
});
