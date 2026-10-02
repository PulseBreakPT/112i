import { isSolarNight } from './solarEngine';

export const PORTUGAL_TIME_ZONE = 'Europe/Lisbon';

const asDate = value => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
};

export const portugalTime = value => new Intl.DateTimeFormat('pt-PT', {
  timeZone: PORTUGAL_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
}).format(asDate(value));

export const portugalShortTime = value => new Intl.DateTimeFormat('pt-PT', {
  timeZone: PORTUGAL_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(asDate(value));

export const portugalDateTime = value => new Intl.DateTimeFormat('pt-PT', {
  timeZone: PORTUGAL_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
}).format(asDate(value));

export const portugalHour = value => Number(new Intl.DateTimeFormat('en-GB', {
  timeZone: PORTUGAL_TIME_ZONE,
  hour: '2-digit',
  hourCycle: 'h23',
}).format(asDate(value)));

export const isPortugalNight = (value, location = null) => isSolarNight(asDate(value), location || { lat: 39.5, lng: -8, land: 'mainland' });

export const legacyRealTime = (savedAt, gameElapsed=0, eventElapsed=gameElapsed) => {
  const anchor = asDate(savedAt).getTime();
  const offset = Math.max(0, Number(gameElapsed || 0) - Number(eventElapsed || 0)) * 1000;
  return new Date(anchor - offset).toISOString();
};

export const recordRealTime = (record, game) =>
  record?.real_time || legacyRealTime(game?.saved_at || new Date().toISOString(), game?.elapsed || 0, record?.time ?? game?.elapsed ?? 0);
