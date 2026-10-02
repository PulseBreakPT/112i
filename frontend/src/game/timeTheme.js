import { useEffect, useMemo } from 'react';
import { solarTimesFor, themeTimeZone } from './engines/solarEngine';

export { solarTimesFor, themeTimeZone } from './engines/solarEngine';

/*
 * Distrito 112 uses one deliberate visual environment: dark operations mode.
 * The storage key stays exported for backwards compatibility with old saves,
 * but any historic morning/afternoon/auto preference is ignored and replaced
 * by the permanent night theme.
 */
export const TIME_THEME_STORAGE_KEY = 'distrito112-time-theme';
export const TIME_THEME_MODES = ['night'];

const NIGHT = Object.freeze({
  success: '#78c98f',
  warning: '#d8bc72',
  info: '#b8bcc4',
  danger: '#e38b84',
  neutral: '#b9bcc2',
  violet: '#b7b7bd',
  shadow: '#000000',
  highlight: '#ffffff',

  page: '#050506',
  shell: '#09090a',
  surface: '#141416',
  raised: '#1b1c1f',
  inset: '#0f1012',

  text: '#f1f1f2',
  secondary: '#c8c9cd',
  muted: '#90939a',
  edge: '#ffffff16',
  divider: '#ffffff0d',

  glassA: '#151618ee',
  glassB: '#0e0f11f4',
  cardA: '#ffffff08',
  cardB: '#ffffff04',
  headerA: '#ffffff06',
  headerB: '#00000006',
  controlA: '#ffffff10',
  controlB: '#ffffff06',
  hoverA: '#ffffff14',
  hoverB: '#ffffff0b',
  selectedA: '#ffffff12',
  selectedB: '#ffffff08',

  hud: '#f0f0f1',
  accent: '#d6d8dc',
  quickA: '#161719ee',
  quickB: '#101113f4',
  marker: '#141416f2',
  mapControl: '#151618ee',
  overlayTop: '#00000010',
  overlayBottom: '#00000028',
});

const NIGHT_MAP = Object.freeze({
  background: '#09090a',
  land: '#151517',
  water: '#101113',
  building: '#232428',
  park: '#18191b',
  industrial: '#1d1e21',
  outline: '#33353a',
  waterLine: '#2d2f34',
  boundary: '#46484d',
  major: '#55585e',
  mid: '#42444a',
  minor: '#303238',
  rail: '#3a3c42',
  line: '#2d2f34',
  label: '#b8babf',
  roadLabel: '#9a9ca2',
  otherLabel: '#81838a',
});

export function getMapThemePalette() {
  return { ...NIGHT_MAP };
}

const parseHex = value => {
  const hex = String(value).replace('#', '');
  const expanded = hex.length === 3 ? hex.split('').map(char => char + char).join('') : hex;
  const hasAlpha = expanded.length === 8;
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
    a: hasAlpha ? parseInt(expanded.slice(6, 8), 16) / 255 : 1,
  };
};

const luminance = color => {
  const { r, g, b } = parseHex(color);
  const channels = [r, g, b].map(value => {
    const channel = value / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
};

const readableInk = background => luminance(background) > .179 ? '#08090a' : '#f7f7f8';

const toHsl = color => {
  const { r: red, g: green, b: blue } = parseHex(color);
  const [r, g, b] = [red, green, blue].map(value => value / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min, light = (max + min) / 2;
  const saturation = delta ? delta / (1 - Math.abs(2 * light - 1)) : 0;
  const hue = !delta ? 0 : max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return `${(hue * 60).toFixed(1)} ${(saturation * 100).toFixed(1)}% ${(light * 100).toFixed(1)}%`;
};

const CSS_VARS = Object.freeze({
  '--theme-page-bg': NIGHT.page,
  '--theme-success': NIGHT.success,
  '--theme-warning': NIGHT.warning,
  '--theme-info': NIGHT.info,
  '--theme-danger': NIGHT.danger,
  '--theme-neutral': NIGHT.neutral,
  '--theme-violet': NIGHT.violet,
  '--theme-shadow': NIGHT.shadow,
  '--theme-highlight': NIGHT.highlight,
  '--service-fire': NIGHT.danger,
  '--service-medical': NIGHT.warning,
  '--service-police': NIGHT.info,

  '--background': toHsl(NIGHT.page),
  '--foreground': toHsl(NIGHT.text),
  '--card': toHsl(NIGHT.surface),
  '--card-foreground': toHsl(NIGHT.text),
  '--popover': toHsl(NIGHT.surface),
  '--popover-foreground': toHsl(NIGHT.text),
  '--primary': toHsl(NIGHT.accent),
  '--primary-foreground': toHsl(readableInk(NIGHT.accent)),
  '--secondary': toHsl(NIGHT.raised),
  '--secondary-foreground': toHsl(NIGHT.text),
  '--muted': toHsl(NIGHT.inset),
  '--muted-foreground': toHsl(NIGHT.muted),
  '--accent': toHsl(NIGHT.raised),
  '--accent-foreground': toHsl(NIGHT.text),
  '--destructive': toHsl(NIGHT.danger),
  '--destructive-foreground': toHsl(readableInk(NIGHT.danger)),
  '--border': toHsl(NIGHT.neutral),
  '--input': toHsl(NIGHT.neutral),
  '--ring': toHsl(NIGHT.accent),
  '--chart-1': toHsl(NIGHT.info),
  '--chart-2': toHsl(NIGHT.success),
  '--chart-3': toHsl(NIGHT.warning),
  '--chart-4': toHsl(NIGHT.violet),
  '--chart-5': toHsl(NIGHT.danger),

  '--theme-shell-bg': NIGHT.shell,
  '--theme-surface': NIGHT.surface,
  '--theme-raised': NIGHT.raised,
  '--theme-inset': NIGHT.inset,
  '--distrito-text': NIGHT.text,
  '--distrito-secondary': NIGHT.secondary,
  '--distrito-muted': NIGHT.muted,
  '--distrito-edge': NIGHT.edge,
  '--distrito-divider': NIGHT.divider,
  '--distrito-glass': `linear-gradient(135deg, ${NIGHT.glassA}, ${NIGHT.glassB})`,
  '--distrito-card': `linear-gradient(135deg, ${NIGHT.cardA}, ${NIGHT.cardB})`,
  '--distrito-inset': `linear-gradient(180deg, ${NIGHT.inset}, #0a0b0d)`,
  '--distrito-header': `linear-gradient(100deg, ${NIGHT.headerA}, ${NIGHT.headerB})`,
  '--distrito-control': `linear-gradient(135deg, ${NIGHT.controlA}, ${NIGHT.controlB})`,
  '--distrito-hover': `linear-gradient(125deg, ${NIGHT.hoverA}, ${NIGHT.hoverB})`,
  '--distrito-selected': `linear-gradient(110deg, ${NIGHT.selectedA}, ${NIGHT.selectedB})`,
  '--distrito-focus': NIGHT.accent,
  '--theme-accent': NIGHT.accent,
  '--theme-on-accent': readableInk(NIGHT.accent),
  '--theme-hud-color': NIGHT.hud,
  '--theme-quick-bg': `linear-gradient(135deg, ${NIGHT.quickA}, ${NIGHT.quickB})`,
  '--theme-marker-bg': NIGHT.marker,
  '--theme-map-control-bg': NIGHT.mapControl,
  '--theme-map-overlay': `linear-gradient(180deg, ${NIGHT.overlayTop}, ${NIGHT.overlayBottom})`,
  '--theme-map-filter': 'saturate(.12) brightness(.90) contrast(1.08)',
  '--distrito-hud-text-shadow': `0 1px 3px ${NIGHT.shadow}, 0 2px 8px ${NIGHT.shadow}`,
  '--distrito-hud-icon-shadow': `drop-shadow(0 1px 2px ${NIGHT.shadow})`,
  '--theme-color-scheme': 'dark',
});

const NIGHT_SNAPSHOT = Object.freeze({
  mode: 'night',
  phase: 'night',
  from: 'night',
  to: 'night',
  blend: 0,
  label: 'Noite',
  dark: true,
  detail: 'Modo noturno permanente',
  solar: null,
  timeZone: null,
  cssVars: CSS_VARS,
});

export function getTimeThemeSnapshot() {
  return NIGHT_SNAPSHOT;
}

export function useTimeTheme() {
  const theme = useMemo(() => NIGHT_SNAPSHOT, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.dataset.timeTheme = 'night';
    root.dataset.timeThemeMode = 'night';
    root.dataset.timeThemeDark = 'true';
    root.style.colorScheme = 'dark';
    localStorage.setItem(TIME_THEME_STORAGE_KEY, 'night');
    Object.entries(theme.cssVars).forEach(([key, value]) => root.style.setProperty(key, value));
  }, [theme]);

  return {
    themeMode: 'night',
    setThemeMode: () => {},
    theme,
  };
}
