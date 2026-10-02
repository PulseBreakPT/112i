import { getMapThemePalette, getTimeThemeSnapshot, solarTimesFor } from './timeTheme';

const minutes = date => date.getUTCHours() * 60 + date.getUTCMinutes();

test('Faro winter solar times remain available to gameplay systems', () => {
  const times = solarTimesFor(new Date('2026-12-21T12:00:00Z'), 37.0194, -7.9304, 'Europe/Lisbon');
  expect(minutes(times.sunrise)).toBeGreaterThanOrEqual(458);
  expect(minutes(times.sunrise)).toBeLessThanOrEqual(466);
  expect(minutes(times.sunset)).toBeGreaterThanOrEqual(1035);
  expect(minutes(times.sunset)).toBeLessThanOrEqual(1043);
});

test.each(['auto', 'morning', 'afternoon', 'night', undefined])('visual mode is always night for request %s', mode => {
  const theme = getTimeThemeSnapshot(new Date('2026-06-21T12:00:00Z'), { lat: 37.0194, lng: -7.9304, city: 'Faro' }, mode);
  expect(theme.mode).toBe('night');
  expect(theme.phase).toBe('night');
  expect(theme.from).toBe('night');
  expect(theme.to).toBe('night');
  expect(theme.dark).toBe(true);
});

const luminance = color => {
  const rgb = color.startsWith('#') ? [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)) : color.match(/[\d.]+/g).slice(0, 3).map(Number);
  const channels = rgb.map(v => {
    const c = v / 255;
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
};
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);

test('core dark-theme text reaches enhanced contrast on all main surfaces', () => {
  const { cssVars } = getTimeThemeSnapshot();
  for (const ink of ['--distrito-text', '--distrito-secondary']) {
    for (const surface of ['--theme-surface', '--theme-inset', '--theme-raised']) {
      expect(contrast(cssVars[ink], cssVars[surface])).toBeGreaterThanOrEqual(7);
    }
  }
  for (const surface of ['--theme-surface', '--theme-inset', '--theme-raised']) {
    expect(contrast(cssVars['--distrito-muted'], cssVars[surface])).toBeGreaterThanOrEqual(4.5);
  }
});

test('semantic colors remain readable in dark mode', () => {
  const { cssVars } = getTimeThemeSnapshot();
  for (const role of ['success', 'warning', 'info', 'danger', 'neutral', 'violet']) {
    for (const surface of ['--theme-surface', '--theme-inset', '--theme-raised']) {
      expect(contrast(cssVars['--theme-' + role], cssVars[surface])).toBeGreaterThanOrEqual(4.5);
    }
  }
  expect(cssVars['--service-fire']).toBe(cssVars['--theme-danger']);
  expect(cssVars['--service-medical']).toBe(cssVars['--theme-warning']);
  expect(cssVars['--service-police']).toBe(cssVars['--theme-info']);
  expect(contrast(cssVars['--theme-on-accent'], cssVars['--theme-accent'])).toBeGreaterThanOrEqual(4.5);
});

test('map palette is dark and stable regardless of former daylight arguments', () => {
  expect(getMapThemePalette('morning', 'afternoon', .5)).toEqual(getMapThemePalette('night', 'night', 0));
  const palette = getMapThemePalette();
  expect(luminance(palette.background)).toBeLessThan(.02);
  expect(contrast(palette.label, palette.background)).toBeGreaterThanOrEqual(7);
  expect(contrast(palette.roadLabel, palette.background)).toBeGreaterThanOrEqual(4.5);
});

test('dark mode provides valid HSL tokens for portal components', () => {
  const { cssVars } = getTimeThemeSnapshot();
  for (const name of ['background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground', 'primary', 'primary-foreground', 'secondary', 'muted', 'muted-foreground', 'accent', 'destructive', 'destructive-foreground', 'input', 'border', 'ring']) {
    expect(cssVars['--' + name]).toMatch(/^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/);
  }
});
