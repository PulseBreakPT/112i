import { getTimeThemeSnapshot, solarTimesFor } from './timeTheme';

const minutes = date => date.getUTCHours() * 60 + date.getUTCMinutes();

test('Faro winter solar times match the expected late-December window', () => {
  const times = solarTimesFor(new Date('2026-12-21T12:00:00Z'), 37.0194, -7.9304, 'Europe/Lisbon');
  expect(minutes(times.sunrise)).toBeGreaterThanOrEqual(458);
  expect(minutes(times.sunrise)).toBeLessThanOrEqual(466);
  expect(minutes(times.sunset)).toBeGreaterThanOrEqual(1035);
  expect(minutes(times.sunset)).toBeLessThanOrEqual(1043);
  expect(minutes(times.dusk)).toBeGreaterThanOrEqual(1064);
  expect(minutes(times.dusk)).toBeLessThanOrEqual(1072);
});

test('auto theme is night after civil dusk in Faro', () => {
  const theme = getTimeThemeSnapshot(new Date('2026-12-21T19:00:00Z'), { lat: 37.0194, lng: -7.9304, city: 'Faro', land: 'mainland' }, 'auto');
  expect(theme.phase).toBe('night');
  expect(theme.dark).toBe(true);
});

test('manual preview ignores current solar phase', () => {
  const theme = getTimeThemeSnapshot(new Date('2026-12-21T23:00:00Z'), { lat: 37.0194, lng: -7.9304, city: 'Faro', land: 'mainland' }, 'morning');
  expect(theme.phase).toBe('morning');
  expect(theme.label).toBe('Manhã');
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

test.each(['morning', 'afternoon', 'night'])('%s text remains readable on its surfaces', mode => {
  const { cssVars, dark } = getTimeThemeSnapshot(new Date(), {}, mode);
  expect(dark).toBe(mode === 'night');
  for (const ink of ['--distrito-text', '--distrito-secondary', '--distrito-muted']) {
    for (const surface of ['--theme-surface', '--theme-inset', '--theme-raised']) {
      expect(contrast(cssVars[ink], cssVars[surface])).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('manual themes have distinct daylight levels and warm afternoon ink', () => {
  const morning = getTimeThemeSnapshot(new Date(), {}, 'morning').cssVars;
  const afternoon = getTimeThemeSnapshot(new Date(), {}, 'afternoon').cssVars;
  const night = getTimeThemeSnapshot(new Date(), {}, 'night').cssVars;
  expect(luminance(morning['--theme-surface'])).toBeGreaterThan(luminance(afternoon['--theme-surface']));
  expect(luminance(afternoon['--theme-surface'])).toBeGreaterThan(luminance(night['--theme-surface']) * 10);
});

test('dawn and dusk preserve text contrast while surfaces change', () => {
  const location = { lat: 37.0194, lng: -7.9304, city: 'Faro', land: 'mainland' };
  const solar = solarTimesFor(new Date('2026-12-21T12:00:00Z'), location.lat, location.lng, 'Europe/Lisbon');
  for (const [start, end] of [[solar.dawn, solar.sunrise], [new Date(solar.sunset.valueOf() - 3600000), solar.dusk]]) {
    for (let step = 1; step < 10; step++) {
      const { cssVars } = getTimeThemeSnapshot(new Date(start.valueOf() + (end - start) * step / 10), location);
      expect(contrast(cssVars['--distrito-text'], cssVars['--theme-surface'])).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test.each(['morning', 'afternoon', 'night'])('%s semantic chips and service ink meet text contrast', mode => {
  const { cssVars } = getTimeThemeSnapshot(new Date(), {}, mode);
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

test.each(['morning', 'afternoon', 'night'])('%s provides valid HSL tokens for portal components', mode => {
  const { cssVars } = getTimeThemeSnapshot(new Date(), {}, mode);
  for (const name of ['background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground', 'primary', 'primary-foreground', 'secondary', 'muted', 'muted-foreground', 'accent', 'destructive', 'destructive-foreground', 'input', 'border', 'ring']) {
    expect(cssVars['--' + name]).toMatch(/^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/);
  }
});
