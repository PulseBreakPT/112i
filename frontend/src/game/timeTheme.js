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
  success: '#70d7a7',
  warning: '#f0c674',
  info: '#8fc1ff',
  danger: '#ff918a',
  neutral: '#b0bac7',
  violet: '#c4acff',
  shadow: '#02050b',
  highlight: '#d7e6ff',

  page: '#070b12',
  shell: '#0a101a',
  surface: '#111a27',
  raised: '#182536',
  inset: '#0d1521',

  text: '#e9eef5',
  secondary: '#c0c8d2',
  muted: '#98a3b2',
  edge: '#ffffff1f',
  divider: '#ffffff12',

  glassA: '#111b2aee',
  glassB: '#0b121ef4',
  cardA: '#ffffff0b',
  cardB: '#ffffff05',
  headerA: '#ffffff09',
  headerB: '#00000008',
  controlA: '#ffffff12',
  controlB: '#ffffff08',
  hoverA: '#ffffff1f',
  hoverB: '#ffffff11',
  selectedA: '#ffffff18',
  selectedB: '#ffffff0a',

  hud: '#f4f7fb',
  accent: '#63a9ff',
  quickA: '#132033ee',
  quickB: '#0b121ef4',
  marker: '#111923f2',
  mapControl: '#111a26ee',
  overlayTop: '#07111f12',
  overlayBottom: '#02050b30',
});

const NIGHT_MAP = Object.freeze({
  background: '#08111f',
  land: '#101b2a',
  water: '#0a203a',
  building: '#233044',
  park: '#142927',
  industrial: '#1b2635',
  outline: '#3b4a5e',
  waterLine: '#28506a',
  boundary: '#4b5e74',
  major: '#7188a0',
  mid: '#526a82',
  minor: '#344a61',
  rail: '#3b5268',
  line: '#435971',
  label: '#d0deeb',
  roadLabel: '#a2b4c6',
  otherLabel: '#aab9c8',
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

const readableInk = background => luminance(background) > .179 ? '#07101a' : '#f7f9fc';

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
  '--distrito-inset': `linear-gradient(180deg, ${NIGHT.inset}, #09111c)`,
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
  '--theme-map-filter': 'saturate(.88) brightness(.88) contrast(1.08)',
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
