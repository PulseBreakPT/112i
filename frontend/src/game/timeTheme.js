import { useEffect, useState } from 'react';
import { solarTimesFor, themeTimeZone } from './engines/solarEngine';

export { solarTimesFor, themeTimeZone } from './engines/solarEngine';

export const TIME_THEME_STORAGE_KEY = 'distrito112-time-theme';
export const TIME_THEME_MODES = ['auto', 'morning', 'afternoon', 'night'];

const PALETTES = {
  morning: {
    page: '#eaf4ff', shell: '#eef7ff', surface: '#f8fbff', raised: '#edf5fd', inset: '#dceaf7',
    text: '#11263d', secondary: '#36516d', muted: '#6a7f93', edge: '#2c72b52b', divider: '#2c72b51c',
    glassA: '#fbfdfff2', glassB: '#e7f3ffea', cardA: '#ffffffd1', cardB: '#eaf4ffba',
    headerA: '#ffffffc7', headerB: '#dcecff70', controlA: '#ffffffd9', controlB: '#d9ecffc7',
    hoverA: '#dceeffed', hoverB: '#c8e3ffdb', selectedA: '#d0e8ffec', selectedB: '#bcdcffdb',
    hud: '#102b47', accent: '#2878d0', quickA: '#f8fcffe8', quickB: '#dceeffdc',
    marker: '#f7fbfff2', mapControl: '#f7fbffeb', overlayTop: '#68a8dd16', overlayBottom: '#ffffff08',
    saturation: 1.03, brightness: 1.09, contrast: 0.94, sepia: 0.01, dark: false,
  },
  afternoon: {
    page: '#fff1e2', shell: '#fff4e8', surface: '#fff8f0', raised: '#ffead4', inset: '#f4d8bc',
    text: '#3d2416', secondary: '#65422a', muted: '#85664f', edge: '#b35f282b', divider: '#b35f281e',
    glassA: '#fffaf4f0', glassB: '#ffe5cbe8', cardA: '#fff8efd4', cardB: '#ffe1c1bd',
    headerA: '#fff7efcf', headerB: '#ffd3a269', controlA: '#fff3e5dc', controlB: '#ffd8b2c9',
    hoverA: '#ffe0c0f0', hoverB: '#ffc88fdc', selectedA: '#ffd5a8ef', selectedB: '#ffbd78dc',
    hud: '#432716', accent: '#e8792e', quickA: '#fff8efea', quickB: '#ffd9b5df',
    marker: '#fff8eff2', mapControl: '#fff4e8eb', overlayTop: '#f0a04b24', overlayBottom: '#8c4d2110',
    saturation: 1.08, brightness: 1.03, contrast: 0.96, sepia: 0.12, dark: false,
  },
  night: {
    page: '#05070a', shell: '#070a0f', surface: '#11151c', raised: '#1b2029', inset: '#090c11',
    text: '#f0f2f5', secondary: '#c2c8d0', muted: '#a1a9b4', edge: '#ffffff18', divider: '#ffffff10',
    glassA: '#11151cdd', glassB: '#070a10e8', cardA: '#ffffff09', cardB: '#ffffff04',
    headerA: '#ffffff08', headerB: '#00000005', controlA: '#ffffff12', controlB: '#ffffff08',
    hoverA: '#ffffff1e', hoverB: '#ffffff10', selectedA: '#ffffff17', selectedB: '#ffffff09',
    hud: '#ffffff', accent: '#5ba6ef', quickA: '#11151ccd', quickB: '#070a10dc',
    marker: '#111923f2', mapControl: '#101821ec', overlayTop: '#07101a10', overlayBottom: '#02060b38',
    saturation: 0.74, brightness: 0.76, contrast: 1.08, sepia: 0, dark: true,
  },
};

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

const mixPalette = (fromName, toName, amount) => {
  const from = PALETTES[fromName], to = PALETTES[toName], t = clamp(amount);
  const color = key => mixColor(from[key], to[key], t);
  const number = key => lerp(from[key], to[key], t);
  const dark = number('brightness') < 0.9;
  return {
    '--theme-page-bg': color('page'),
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
    '--theme-hud-color': color('hud'),
    '--theme-quick-bg': 'linear-gradient(135deg, ' + color('quickA') + ', ' + color('quickB') + ')',
    '--theme-marker-bg': color('marker'),
    '--theme-map-control-bg': color('mapControl'),
    '--theme-map-overlay': 'linear-gradient(180deg, ' + color('overlayTop') + ', ' + color('overlayBottom') + ')',
    '--theme-map-filter': 'saturate(' + number('saturation').toFixed(3) + ') brightness(' + number('brightness').toFixed(3) + ') contrast(' + number('contrast').toFixed(3) + ') sepia(' + number('sepia').toFixed(3) + ')',
    '--distrito-hud-text-shadow': dark ? '0 1px 2px #000, 0 2px 5px #000, 0 0 2px #000' : '0 1px 2px #fff, 0 0 5px #ffffffd9',
    '--distrito-hud-icon-shadow': dark ? 'drop-shadow(0 1px 1px #000) drop-shadow(0 2px 3px #000d)' : 'drop-shadow(0 1px 1px #fff) drop-shadow(0 0 3px #ffffffc9)',
  };
};

const formatTime = (value, timeZone) => new Intl.DateTimeFormat('pt-PT', {
  timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
}).format(value);

const manualSnapshot = mode => {
  const label = mode === 'morning' ? 'Manhã' : mode === 'afternoon' ? 'Tarde' : 'Noite';
  return {
    mode, phase: mode, from: mode, to: mode, blend: 0, label, dark: mode === 'night',
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

  const dark = from === 'night' && to === 'night' ? true : to === 'night' && blend >= 0.58;
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

  const theme = getTimeThemeSnapshot(now, location, themeMode);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.timeTheme = theme.phase;
    root.dataset.timeThemeMode = themeMode;
    root.dataset.timeThemeDark = theme.dark ? 'true' : 'false';
    Object.entries(theme.cssVars).forEach(([key, value]) => root.style.setProperty(key, value));
    return () => {
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
