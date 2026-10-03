import { portugalTime, portugalShortTime, portugalHour, isPortugalNight, legacyRealTime, portugalWeeklyBillingKey, portugalWeeklyBillingKeysBetween } from './timeEngine';

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


test('weekly fixed billing switches exactly on Monday at 20:00 Portugal time', () => {
  expect(portugalWeeklyBillingKey('2026-10-05T18:59:59.000Z')).toBe('2026-09-28');
  expect(portugalWeeklyBillingKey('2026-10-05T19:00:00.000Z')).toBe('2026-10-05');
  expect(portugalWeeklyBillingKey('2026-10-06T12:00:00.000Z')).toBe('2026-10-05');
});

test('weekly billing detects every crossed Monday without duplicates', () => {
  expect(portugalWeeklyBillingKeysBetween('2026-09-28','2026-10-19T20:30:00.000Z')).toEqual([
    '2026-10-05',
    '2026-10-12',
    '2026-10-19',
  ]);
  expect(portugalWeeklyBillingKeysBetween('2026-10-19','2026-10-19T20:30:00.000Z')).toEqual([]);
});
