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

const portugalCalendarParts = value => {
  const parts=new Intl.DateTimeFormat('en-GB',{
    timeZone:PORTUGAL_TIME_ZONE,
    weekday:'short',
    year:'numeric',
    month:'2-digit',
    day:'2-digit',
    hour:'2-digit',
    minute:'2-digit',
    second:'2-digit',
    hourCycle:'h23',
  }).formatToParts(asDate(value));
  const get=type=>parts.find(part=>part.type===type)?.value;
  return {
    weekday:get('weekday'),
    year:Number(get('year')),
    month:Number(get('month')),
    day:Number(get('day')),
    hour:Number(get('hour')),
    minute:Number(get('minute')),
    second:Number(get('second')),
  };
};

const isoDay = date => date.toISOString().slice(0,10);

export const portugalWeeklyBillingKey = (value, billingHour=20) => {
  const local=portugalCalendarParts(value);
  const weekdayIndex={Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7}[local.weekday]||1;
  const localDay=new Date(Date.UTC(local.year,local.month-1,local.day));
  let daysSinceMonday=weekdayIndex-1;
  if(weekdayIndex===1&&local.hour<billingHour)daysSinceMonday=7;
  localDay.setUTCDate(localDay.getUTCDate()-daysSinceMonday);
  return isoDay(localDay);
};

export const portugalWeeklyBillingKeysBetween = (lastChargedKey, value, billingHour=20) => {
  const currentKey=portugalWeeklyBillingKey(value,billingHour);
  if(!lastChargedKey)return [];
  const last=new Date(lastChargedKey+'T00:00:00.000Z'),current=new Date(currentKey+'T00:00:00.000Z');
  if(Number.isNaN(last.getTime())||current<=last)return [];
  const keys=[];
  for(let cursor=new Date(last.getTime()+7*86400000);cursor<=current&&keys.length<520;cursor=new Date(cursor.getTime()+7*86400000))keys.push(isoDay(cursor));
  return keys;
};

export const isPortugalNight = (value, location = null) => isSolarNight(asDate(value), location || { lat: 39.5, lng: -8, land: 'mainland' });

export const legacyRealTime = (savedAt, gameElapsed=0, eventElapsed=gameElapsed) => {
  const anchor = asDate(savedAt).getTime();
  const offset = Math.max(0, Number(gameElapsed || 0) - Number(eventElapsed || 0)) * 1000;
  return new Date(anchor - offset).toISOString();
};

export const recordRealTime = (record, game) =>
  record?.real_time || legacyRealTime(game?.saved_at || new Date().toISOString(), game?.elapsed || 0, record?.time ?? game?.elapsed ?? 0);
