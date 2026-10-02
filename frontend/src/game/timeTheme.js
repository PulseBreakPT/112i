import { useEffect, useState } from 'react';
import { solarTimesFor, themeTimeZone } from './engines/solarEngine';

export { solarTimesFor, themeTimeZone } from './engines/solarEngine';

export const TIME_THEME_STORAGE_KEY = 'distrito112-time-theme';
export const TIME_THEME_MODES = ['auto', 'morning', 'afternoon', 'night'];

const PALETTES = {
  morning: {
    page: '#08131d', shell: '#0a1722', surface: '#112536', raised: '#19344a', inset: '#0a1a27',
    text: '#f3f8fc', secondary: '#c8d8e5', muted: '#91a9bb', edge: '#8bc8ff1c', divider: '#b8dcff12',
    glassA: '#10283bdd', glassB: '#081824e8', cardA: '#8bc8ff12', cardB: '#6eb8ff08',
    headerA: '#b9ddff0a', headerB: '#07121d05', controlA: '#b4dcff14', controlB: '#7bbfff0b',
    hoverA: '#9ed2ff20', hoverB: '#67b4ff12', selectedA: '#8cc9ff18', selectedB: '#5dacfa0d',
    hud: '#ffffff', accent: '#7dc3ff', quickA: '#10283bcc', quickB: '#081824dc',
    marker: '#102433f2', mapControl: '#0e2230ec', overlayTop: '#7ac7ff0b', overlayBottom: '#06111b20',
    saturation: 0.92, brightness: 0.98, contrast: 1.01, sepia: 0.01, dark: true,
  },
  afternoon: {
    page: '#18110c', shell: '#1b130d', surface: '#2a1d13', raised: '#382719', inset: '#1a120c',
    text: '#fff8f1', secondary: '#ead8c6', muted: '#bca18a', edge: '#ffc58d1d', divider: '#ffd7ae12',
    glassA: '#2c1d12dd', glassB: '#160f0ae8', cardA: '#ffbc7d12', cardB: '#e99a5408',
    headerA: '#ffd0a00a', headerB: '#140c0705', controlA: '#ffc18b14', controlB: '#e9914a0b',
    hoverA: '#ffc08a20', hoverB: '#e88b4312', selectedA: '#ffb77818', selectedB: '#db7d390d',
    hud: '#ffffff', accent: '#f2a45f', quickA: '#2c1d12cc', quickB: '#160f0adc',
    marker: '#291b12f2', mapControl: '#25180fec', overlayTop: '#e7984a12', overlayBottom: '#120a061f',
    saturation: 0.86, brightness: 0.90, contrast: 1.04, sepia: 0.10, dark: true,
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
