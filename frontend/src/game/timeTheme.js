import { useEffect, useState } from 'react';
import { solarTimesFor, themeTimeZone } from './engines/solarEngine';

export { solarTimesFor, themeTimeZone } from './engines/solarEngine';

export const TIME_THEME_STORAGE_KEY = 'distrito112-time-theme';
export const TIME_THEME_MODES = ['auto', 'morning', 'afternoon', 'night'];

const PALETTES = {
  morning: {
    page: '#070c11', shell: '#090f15', surface: '#111922', raised: '#19242f', inset: '#0b1118',
    text: '#f1f5f8', secondary: '#c7d1d9', muted: '#96a6b3', edge: '#b8d6ef19', divider: '#d2e4f210',
    glassA: '#111922dd', glassB: '#080e14e8', cardA: '#ffffff09', cardB: '#8fc5ed04',
    headerA: '#ffffff08', headerB: '#87bce004', controlA: '#ffffff11', controlB: '#8ebcdb07',
    hoverA: '#ffffff1c', hoverB: '#8fc4e80a', selectedA: '#ffffff16', selectedB: '#83b7dc08',
    hud: '#ffffff', accent: '#79baf0', quickA: '#111922cc', quickB: '#080e14dc',
    marker: '#111b24f2', mapControl: '#0e171fec', overlayTop: '#83bee20a', overlayBottom: '#04080d22',
    saturation: 0.90, brightness: 0.94, contrast: 1.03, sepia: 0.01, dark: true,
  },
  afternoon: {
    page: '#0d0b09', shell: '#110e0b', surface: '#191510', raised: '#24201a', inset: '#0f0d0a',
    text: '#f4f2ef', secondary: '#d5cec5', muted: '#aaa096', edge: '#e7c6a51a', divider: '#eed5bb10',
    glassA: '#1a1611dd', glassB: '#0c0a08e8', cardA: '#ffffff09', cardB: '#d99a5c04',
    headerA: '#ffffff08', headerB: '#d69a5e04', controlA: '#ffffff11', controlB: '#d59a6307',
    hoverA: '#ffffff1b', hoverB: '#d493550a', selectedA: '#ffffff16', selectedB: '#c9854908',
    hud: '#ffffff', accent: '#dfa064', quickA: '#1a1611cc', quickB: '#0c0a08dc',
    marker: '#1a1611f2', mapControl: '#17130fec', overlayTop: '#d89b5d0d', overlayBottom: '#08060424',
    saturation: 0.84, brightness: 0.89, contrast: 1.05, sepia: 0.055, dark: true,
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
    '--distrito-hud-text-shadow': '0 1px 2px rgba(0,0,0,.88), 0 0 1px rgba(0,0,0,.38)',
    '--distrito-hud-icon-shadow': 'drop-shadow(0 1px 1px rgba(0,0,0,.88)) drop-shadow(0 0 1px rgba(0,0,0,.32))',
  };
};

const formatTime = (value, timeZone) => new Intl.DateTimeFormat('pt-PT', {
  timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
}).format(value);

const manualSnapshot = mode => {
  const label = mode === 'morning' ? 'Manhã' : mode === 'afternoon' ? 'Tarde' : 'Noite';
  return {
    mode, phase: mode, from: mode, to: mode, blend: 0, label, dark: true,
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

  const dark = true;
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
