const DAY_MS = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const J0 = 0.0009;
const RAD = Math.PI / 180;

const toJulian = date => date.valueOf() / DAY_MS - 0.5 + J1970;
const fromJulian = julian => new Date((julian + 0.5 - J1970) * DAY_MS);
const toDays = date => toJulian(date) - J2000;
const solarMeanAnomaly = day => RAD * (357.5291 + 0.98560028 * day);
const eclipticLongitude = anomaly => anomaly + RAD * (1.9148 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly) + 0.0003 * Math.sin(3 * anomaly)) + RAD * 102.9372 + Math.PI;
const declination = longitude => Math.asin(Math.sin(longitude) * Math.sin(RAD * 23.4397));
const julianCycle = (day, lw) => Math.round(day - J0 - lw / (2 * Math.PI));
const approxTransit = (angle, lw, cycle) => J0 + (angle + lw) / (2 * Math.PI) + cycle;
const solarTransitJulian = (transit, anomaly, longitude) => J2000 + transit + 0.0053 * Math.sin(anomaly) - 0.0069 * Math.sin(2 * longitude);
const hourAngle = (height, latitude, dec) => Math.acos((Math.sin(height) - Math.sin(latitude) * Math.sin(dec)) / (Math.cos(latitude) * Math.cos(dec)));
const setJulian = (height, lw, latitude, dec, cycle, anomaly, longitude) => {
  const angle = hourAngle(height, latitude, dec);
  return solarTransitJulian(approxTransit(angle, lw, cycle), anomaly, longitude);
};

const localCalendarDate = (now, timeZone) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12));
};

export const themeTimeZone = location => ['sao-miguel', 'terceira', 'azores'].includes(location?.land) ? 'Atlantic/Azores' : 'Europe/Lisbon';

export function solarTimesFor(now = new Date(), latitude = 39.5, longitude = -8, timeZone = 'Europe/Lisbon') {
  const date = localCalendarDate(now, timeZone);
  const lw = RAD * -longitude;
  const phi = RAD * latitude;
  const day = toDays(date);
  const cycle = julianCycle(day, lw);
  const transit = approxTransit(0, lw, cycle);
  const anomaly = solarMeanAnomaly(transit);
  const longitudeSun = eclipticLongitude(anomaly);
  const dec = declination(longitudeSun);
  const noon = solarTransitJulian(transit, anomaly, longitudeSun);

  const pair = degrees => {
    const set = setJulian(degrees * RAD, lw, phi, dec, cycle, anomaly, longitudeSun);
    return [fromJulian(noon - (set - noon)), fromJulian(set)];
  };
  const [sunrise, sunset] = pair(-0.833);
  const [dawn, dusk] = pair(-6);
  return { dawn, sunrise, solarNoon: fromJulian(noon), sunset, dusk };
}

export const isSolarNight = (value = new Date(), location = {}) => {
  const date = value instanceof Date ? value : new Date(value);
  const latitude = Number(location?.lat) || 39.5;
  const longitude = Number(location?.lng) || -8;
  const times = solarTimesFor(date, latitude, longitude, themeTimeZone(location));
  return date < times.dawn || date >= times.dusk;
};
