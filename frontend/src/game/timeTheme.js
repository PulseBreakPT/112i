import { useEffect, useMemo, useState } from 'react';
import { solarTimesFor, themeTimeZone } from './engines/solarEngine';

export { solarTimesFor, themeTimeZone } from './engines/solarEngine';

export const TIME_THEME_STORAGE_KEY = 'distrito112-time-theme';
export const TIME_THEME_MODES = ['auto', 'morning', 'afternoon', 'night'];

const PALETTES = {
  morning: {
    success: '#176141', warning: '#794a00', info: '#175b98', danger: '#b22b35', neutral: '#526270', violet: '#68429e', shadow: '#173447', highlight: '#ffffff',
    page: '#edf3f5', shell: '#e5eef1', surface: '#ffffff', raised: '#f6fafb', inset: '#e8f0f3',
    text: '#172e3d', secondary: '#365363', muted: '#526c79', edge: '#224b6529', divider: '#224b651a',
    glassA: '#ffffffef', glassB: '#f0f7faf5', cardA: '#ffffffd9', cardB: '#f5fafbd9',
    headerA: '#e3f1f8cc', headerB: '#ffffff66', controlA: '#ffffffed', controlB: '#e9f2f7dd',
    hoverA: '#dceef8ee', hoverB: '#e8f3f9ee', selectedA: '#cde6f6ee', selectedB: '#e1f0faee',
    hud: '#173447', accent: '#176a9b', quickA: '#fffffff0', quickB: '#edf6faf0',
    marker: '#f7fbfff5', mapControl: '#f5fafaf2', overlayTop: '#ffffff00', overlayBottom: '#8ab1c008',
    saturation: 1, brightness: 1, contrast: 1, sepia: 0, dark: false,
  },
  afternoon: {
    success: '#24633f', warning: '#804400', info: '#275487', danger: '#9f2d25', neutral: '#6c5545', violet: '#75509b', shadow: '#502d17', highlight: '#fffbf3',
    page: '#f6e4ce', shell: '#efdabf', surface: '#fff5e8', raised: '#fff9f0', inset: '#efddc8',
    text: '#432a1e', secondary: '#694833', muted: '#7c573d', edge: '#92502030', divider: '#92502020',
    glassA: '#fff5e8ef', glassB: '#f9e4ccf5', cardA: '#fff9efd9', cardB: '#ffe9d1c9',
    headerA: '#f6c58c80', headerB: '#fff6e866', controlA: '#fff5e8ed', controlB: '#f8dfbfdd',
    hoverA: '#f5cda0ee', hoverB: '#ffe5c5ee', selectedA: '#f7c48eee', selectedB: '#ffdfb8ee',
    hud: '#4b2c1d', accent: '#a84a12', quickA: '#fff5e8f0', quickB: '#f8e0c4f0',
    marker: '#fff4e4f5', mapControl: '#fff0ddf2', overlayTop: '#627ab612', overlayBottom: '#ff882c22',
    saturation: 1, brightness: 1, contrast: 1, sepia: 0, dark: false,
  },
  night: {
    success: '#8ae2b5', warning: '#f8ca78', info: '#9cc5ff', danger: '#ffa19a', neutral: '#b0b7c2', violet: '#c4acff', shadow: '#020510', highlight: '#c5d8ff',
    page: '#040817', shell: '#070e20', surface: '#101c32', raised: '#1a2b45', inset: '#0a1327',
    text: '#f0f2f5', secondary: '#c2c8d0', muted: '#a1a9b4', edge: '#ffffff18', divider: '#ffffff10',
    glassA: '#101e36ed', glassB: '#080f24f2', cardA: '#ffffff09', cardB: '#ffffff04',
    headerA: '#ffffff08', headerB: '#00000005', controlA: '#ffffff12', controlB: '#ffffff08',
    hoverA: '#ffffff1e', hoverB: '#ffffff10', selectedA: '#ffffff17', selectedB: '#ffffff09',
    hud: '#ffffff', accent: '#5ba6ef', quickA: '#12223ced', quickB: '#080f24f0',
    marker: '#111923f2', mapControl: '#101821ec', overlayTop: '#0e256914', overlayBottom: '#03061924',
    saturation: 1, brightness: 1, contrast: 1, sepia: 0, dark: true,
  },
};

const MAP_PALETTES = {
  morning: { background: '#e7f1f5', land: '#e3eddf', water: '#93cce6', building: '#c2cdd0', park: '#c2d9c2', industrial: '#d8dcdc', outline: '#a3b5bd', waterLine: '#75afc5', boundary: '#8fa5ae', major: '#ffffff', mid: '#ffffff', minor: '#f8faf5', rail: '#94a5ae', line: '#bac8cd', label: '#284754', roadLabel: '#506872', otherLabel: '#47616b' },
  afternoon: { background: '#f0c198', land: '#eac299', water: '#a5b9cb', building: '#c49e7f', park: '#c7bb8b', industrial: '#d7b592', outline: '#ae8263', waterLine: '#829e9e', boundary: '#a67a53', major: '#fff3d9', mid: '#fae5c7', minor: '#f4d8b4', rail: '#ac8a6e', line: '#c69d77', label: '#583a25', roadLabel: '#78533b', otherLabel: '#6c5038' },
  night: { background: '#070e24', land: '#101d33', water: '#091d3d', building: '#243146', park: '#142c2c', industrial: '#1c2739', outline: '#36465b', waterLine: '#23475a', boundary: '#41546b', major: '#6c829b', mid: '#4d647e', minor: '#2e435d', rail: '#33495d', line: '#3b5068', label: '#c5d7e7', roadLabel: '#91a7bd', otherLabel: '#9aafc1' },
};

export function getMapThemePalette(from = 'night', to = from, blend = 0) {
  const a = MAP_PALETTES[from] || MAP_PALETTES.night;
  const b = MAP_PALETTES[to] || a;
  const palette = Object.fromEntries(Object.keys(a).map(key => [key, mixColor(a[key], b[key], blend)]));
  if (from !== to && (from === 'night' || to === 'night') && blend > 0 && blend < 1) {
    const ink = readableInk(palette.background);
    palette.label = palette.roadLabel = palette.otherLabel = ink;
  }
  return palette;
}

const clamp = value => Math.max(0, Math.min(1, value));
const progress = (now, start, end) => clamp((now.valueOf() - start.valueOf()) / Math.max(1, end.valueOf() - start.valueOf()));
const lerp = (a, b, amount) => a + (b - a) * amount;

const parseHex = value => {
  const hex = value.replace('#', '');
  const expanded = hex.length === 3 ? hex.split('').map(char => char + char).join('') : hex;
  const hasAlpha = expanded.length === 8;
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
    a: hasAlpha ? parseInt(expanded.slice(6, 8), 16) / 255 : 1,
  };
};

const mixColor = (from, to, amount) => {
  const a = parseHex(from), b = parseHex(to), t = clamp(amount);
  return 'rgba(' + Math.round(lerp(a.r, b.r, t)) + ', ' + Math.round(lerp(a.g, b.g, t)) + ', ' + Math.round(lerp(a.b, b.b, t)) + ', ' + lerp(a.a, b.a, t).toFixed(3) + ')';
};

// Day/night ink cannot be interpolated through grey: it would disappear at dusk.
const luminance = color => {
  const values = color.startsWith('#') ? Object.values(parseHex(color)).slice(0, 3) : color.match(/[\d.]+/g).slice(0, 3).map(Number);
  const [r, g, b] = values.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
};
const readableInk = background => luminance(background) > .179 ? '#000000' : '#ffffff';

const toHsl = color => {
  const values = color.startsWith('#') ? Object.values(parseHex(color)).slice(0, 3) : color.match(/[\d.]+/g).slice(0, 3).map(Number);
  const [r, g, b] = values.map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min, light = (max + min) / 2;
  const saturation = delta ? delta / (1 - Math.abs(2 * light - 1)) : 0;
  const hue = !delta ? 0 : max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return `${(hue * 60).toFixed(1)} ${(saturation * 100).toFixed(1)}% ${(light * 100).toFixed(1)}%`;
};

const mixPalette = (fromName, toName, amount) => {
  const from = PALETTES[fromName], to = PALETTES[toName], t = clamp(amount);
  const transitioning = from.dark !== to.dark && t > 0 && t < 1;
  const surface = mixColor(from.surface, to.surface, t);
  const color = key => transitioning && ['text', 'secondary', 'muted', 'accent', 'success', 'warning', 'info', 'danger', 'neutral', 'violet'].includes(key)
    ? readableInk(surface)
    : transitioning && key === 'hud'
      ? readableInk(mixColor(MAP_PALETTES[fromName].background, MAP_PALETTES[toName].background, t))
      : mixColor(from[key], to[key], t);
  const number = key => lerp(from[key], to[key], t);
  return {
    '--theme-page-bg': color('page'),
    ...Object.fromEntries(['success', 'warning', 'info', 'danger', 'neutral', 'violet', 'shadow', 'highlight'].map(key => ['--theme-' + key, color(key)])),
    '--service-fire': color('danger'), '--service-medical': color('warning'), '--service-police': color('info'),
    ...Object.fromEntries(Object.entries({
      background: 'page', foreground: 'text', card: 'surface', 'card-foreground': 'text',
      popover: 'surface', 'popover-foreground': 'text', primary: 'accent', secondary: 'raised',
      'secondary-foreground': 'text', muted: 'inset', 'muted-foreground': 'muted',
      accent: 'raised', 'accent-foreground': 'text', destructive: 'danger',
      border: 'neutral', input: 'neutral', ring: 'accent',
      'chart-1': 'info', 'chart-2': 'success', 'chart-3': 'warning', 'chart-4': 'violet', 'chart-5': 'danger',
    }).map(([key, source]) => ['--' + key, toHsl(color(source))])),
    '--primary-foreground': toHsl(readableInk(color('accent'))),
    '--destructive-foreground': toHsl(readableInk(color('danger'))),
    '--theme-shell-bg': color('shell'),
    '--theme-surface': color('surface'),
    '--theme-raised': color('raised'),
    '--theme-inset': color('inset'),
    '--distrito-text': color('text'),
    '--distrito-secondary': color('secondary'),
    '--distrito-muted': color('muted'),
    '--distrito-edge': color('edge'),
    '--distrito-divider': color('divider'),
    '--distrito-glass': 'linear-gradient(135deg, ' + color('glassA') + ', ' + color('glassB') + ')',
    '--distrito-card': 'linear-gradient(135deg, ' + color('cardA') + ', ' + color('cardB') + ')',
    '--distrito-inset': 'linear-gradient(180deg, ' + color('inset') + ', ' + mixColor(from.inset, to.inset, Math.min(1, t + 0.08)) + ')',
    '--distrito-header': 'linear-gradient(100deg, ' + color('headerA') + ', ' + color('headerB') + ')',
    '--distrito-control': 'linear-gradient(135deg, ' + color('controlA') + ', ' + color('controlB') + ')',
    '--distrito-hover': 'linear-gradient(125deg, ' + color('hoverA') + ', ' + color('hoverB') + ')',
    '--distrito-selected': 'linear-gradient(110deg, ' + color('selectedA') + ', ' + color('selectedB') + ')',
    '--distrito-focus': color('accent'),
    '--theme-accent': color('accent'),
    '--theme-on-accent': readableInk(color('accent')),
    '--theme-hud-color': color('hud'),
    '--theme-quick-bg': 'linear-gradient(135deg, ' + color('quickA') + ', ' + color('quickB') + ')',
    '--theme-marker-bg': color('marker'),
    '--theme-map-control-bg': color('mapControl'),
    '--theme-map-overlay': 'linear-gradient(180deg, ' + color('overlayTop') + ', ' + color('overlayBottom') + ')',
    '--theme-map-filter': 'saturate(' + number('saturation').toFixed(3) + ') brightness(' + number('brightness').toFixed(3) + ') contrast(' + number('contrast').toFixed(3) + ') sepia(' + number('sepia').toFixed(3) + ')',
    '--distrito-hud-text-shadow': '0 1px 3px ' + color('surface'),
    '--distrito-hud-icon-shadow': 'drop-shadow(0 1px 2px ' + color('surface') + ')',
  };
};

const formatTime = (value, timeZone) => new Intl.DateTimeFormat('pt-PT', {
  timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
}).format(value);

const manualSnapshot = mode => {
  const label = mode === 'morning' ? 'Manhã' : mode === 'afternoon' ? 'Tarde' : 'Noite';
  return {
    mode, phase: mode, from: mode, to: mode, blend: 0, label, dark: PALETTES[mode].dark,
    detail: 'Pré-visualização manual', solar: null, cssVars: mixPalette(mode, mode, 0),
  };
};

export function getTimeThemeSnapshot(now = new Date(), location = {}, mode = 'auto') {
  if (mode !== 'auto') return manualSnapshot(TIME_THEME_MODES.includes(mode) ? mode : 'morning');

  const latitude = Number(location?.lat) || 39.5;
  const longitude = Number(location?.lng) || -8;
  const timeZone = themeTimeZone(location);
  const solar = solarTimesFor(now, latitude, longitude, timeZone);
  const noonTransitionStart = new Date(solar.solarNoon.valueOf() - 30 * 60000);
  const noonTransitionEnd = new Date(solar.solarNoon.valueOf() + 30 * 60000);
  const sunsetTransitionStart = new Date(solar.sunset.valueOf() - 60 * 60000);

  let from = 'night', to = 'night', blend = 0, phase = 'night', label = 'Noite';
  if (now < solar.dawn) {
    phase = 'night';
  } else if (now < solar.sunrise) {
    from = 'night'; to = 'morning'; blend = progress(now, solar.dawn, solar.sunrise); phase = 'dawn'; label = 'Amanhecer';
  } else if (now < noonTransitionStart) {
    from = to = 'morning'; phase = 'morning'; label = 'Manhã';
  } else if (now < noonTransitionEnd) {
    from = 'morning'; to = 'afternoon'; blend = progress(now, noonTransitionStart, noonTransitionEnd); phase = 'day-transition'; label = blend < 0.5 ? 'Manhã' : 'Tarde';
  } else if (now < sunsetTransitionStart) {
    from = to = 'afternoon'; phase = 'afternoon'; label = 'Tarde';
  } else if (now < solar.dusk) {
    from = 'afternoon'; to = 'night'; blend = progress(now, sunsetTransitionStart, solar.dusk); phase = 'sunset'; label = 'Entardecer';
  }

  const dark = luminance(mixColor(PALETTES[from].surface, PALETTES[to].surface, blend)) <= .179;
  const place = location?.city || location?.name || 'Portugal';
  const detail = place + ' · Sol ' + formatTime(solar.sunrise, timeZone) + '–' + formatTime(solar.sunset, timeZone) + ' · Escuro ' + formatTime(solar.dusk, timeZone);

  return { mode: 'auto', phase, from, to, blend, label, dark, detail, solar, timeZone, cssVars: mixPalette(from, to, blend) };
}

export function useTimeTheme(location) {
  const [themeMode, setThemeModeState] = useState(() => {
    const saved = localStorage.getItem(TIME_THEME_STORAGE_KEY);
    return TIME_THEME_MODES.includes(saved) ? saved : 'auto';
  });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const { lat, lng, city, name, land } = location || {};
  const theme = useMemo(() => getTimeThemeSnapshot(now, { lat, lng, city, name, land }, themeMode),
    [now, lat, lng, city, name, land, themeMode]);

  useEffect(() => {
    const root = document.documentElement;
    const previousDarkClass = root.classList.contains('dark');
    root.classList.toggle('dark', theme.dark);
    root.dataset.timeTheme = theme.phase;
    root.dataset.timeThemeMode = themeMode;
    root.dataset.timeThemeDark = theme.dark ? 'true' : 'false';
    Object.entries(theme.cssVars).forEach(([key, value]) => root.style.setProperty(key, value));
    return () => {
      root.classList.toggle('dark', previousDarkClass);
      delete root.dataset.timeTheme;
      delete root.dataset.timeThemeMode;
      delete root.dataset.timeThemeDark;
      Object.keys(theme.cssVars).forEach(key => root.style.removeProperty(key));
    };
  }, [theme, themeMode]);

  const setThemeMode = value => {
    const next = TIME_THEME_MODES.includes(value) ? value : 'auto';
    localStorage.setItem(TIME_THEME_STORAGE_KEY, next);
    setThemeModeState(next);
    setNow(new Date());
  };

  return { themeMode, setThemeMode, theme };
}
