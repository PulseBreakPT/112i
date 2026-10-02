import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Plus, Minus, LocateFixed, Layers3, ArrowUpRight } from 'lucide-react';
import { getMapThemePalette } from './timeTheme';
import { SERVICE } from './common';
import { vehicleImage } from './vehicleMedia';
import { IconButton } from './Shell';
import { incidentMarkerKind, incidentMapState, incidentMapStatusLabel, incidentPrimaryService, isIncidentVisibleOnMap } from './incidentMapPresentation';
import 'maplibre-gl/dist/maplibre-gl.css';
import './PortugalMap.css';

maplibregl.setWorkerUrl(`${process.env.PUBLIC_URL || ''}/maplibre/maplibre-gl-worker.mjs`);

const EMPTY = { type: 'FeatureCollection', features: [] };

function calmCartography(map, detailed = false, palette = getMapThemePalette()) {
  // Mantém a cartografia OpenStreetMap, mas trata-a como contexto operacional.
  if (!map.__distritoLayerState) {
    map.__distritoLayerState = Object.fromEntries(map.getStyle().layers.map(layer => [
      layer.id,
      { visibility: layer.layout?.visibility || 'visible', minzoom: layer.minzoom ?? 0, maxzoom: layer.maxzoom ?? 24 },
    ]));
  }
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1200;
  const safe = (method, ...args) => {
    try {
      if (method === 'setPaintProperty' && args[1].endsWith('-color')) {
        map.setPaintProperty(args[0], args[1] + '-transition', { duration, delay: 0 });
      }
      map[method](...args);
    } catch (_) {}
  };
  for (const layer of map.getStyle().layers) {
    if (layer.source === 'operational-routes') continue;
    const name = layer.id.toLowerCase();
    const original = map.__distritoLayerState[layer.id] || { visibility: 'visible', minzoom: 0, maxzoom: 24 };
    const isPoi = /poi|housenumber|address|amenity|shop|school|hospital|parking|transit|station|airport|ferry/.test(name);
    const isMinorLabel = /village|suburb|neighbour|hamlet|highway-name-minor|road-label-minor|street-label|path-label/.test(name);
    const isPlace = /place|city|town|village|suburb|neighbour|hamlet/.test(name);
    const isMajorRoad = /motorway|trunk|primary/.test(name);
    const isMidRoad = /secondary|tertiary/.test(name);
    const isMinorRoad = /minor|residential|service|street|path|track/.test(name);
    const isBoundary = /boundary/.test(name);
    const hiddenInCleanMode = isPoi || isMinorLabel;
    safe('setLayoutProperty', layer.id, 'visibility', !detailed && hiddenInCleanMode ? 'none' : original.visibility);

    if (layer.type === 'background') safe('setPaintProperty', layer.id, 'background-color', palette.background);
    if (layer.type === 'fill') {
      const color = /water/.test(name) ? palette.water : /building/.test(name) ? palette.building : /park|wood|forest|landcover|grass/.test(name) ? palette.park : /industrial/.test(name) ? palette.industrial : palette.land;
      safe('setPaintProperty', layer.id, 'fill-color', color);
      safe('setPaintProperty', layer.id, 'fill-opacity', detailed ? (/building/.test(name) ? .58 : .82) : (/building/.test(name) ? .24 : .62));
      if (/building/.test(name)) safe('setPaintProperty', layer.id, 'fill-outline-color', palette.outline);
    }
    if (layer.type === 'line') {
      const color = /water/.test(name) ? palette.waterLine : isBoundary ? palette.boundary : isMajorRoad ? palette.major : isMidRoad ? palette.mid : isMinorRoad ? palette.minor : /rail/.test(name) ? palette.rail : palette.line;
      const opacity = detailed ? (isMajorRoad ? .88 : isMidRoad ? .68 : isMinorRoad ? .52 : .48) : (isMajorRoad ? .7 : isMidRoad ? .42 : isMinorRoad ? .2 : isBoundary ? .18 : .28);
      const width = isMajorRoad ? (detailed ? 2.5 : 1.7) : isMidRoad ? (detailed ? 1.8 : 1.1) : (detailed ? 1.15 : .72);
      safe('setPaintProperty', layer.id, 'line-color', color);
      safe('setPaintProperty', layer.id, 'line-opacity', opacity);
      safe('setPaintProperty', layer.id, 'line-width', ['interpolate', ['linear'], ['zoom'], 5, width * .55, 12, width, 18, width * 1.65]);
    }
    if (layer.type === 'symbol' && layer.layout?.['text-field']) {
      const labelColor = isPlace ? palette.label : /road|highway/.test(name) ? palette.roadLabel : palette.otherLabel;
      safe('setPaintProperty', layer.id, 'text-color', labelColor);
      safe('setPaintProperty', layer.id, 'text-opacity', detailed ? (isPlace ? 1 : .9) : (isPlace ? .95 : .78));
      safe('setPaintProperty', layer.id, 'text-halo-color', palette.background);
      safe('setPaintProperty', layer.id, 'text-halo-width', detailed ? 1.4 : 1.8);
      safe('setLayoutProperty', layer.id, 'text-size', isPlace ? (detailed ? 14 : 12) : (detailed ? 11 : 9.5));
    }
    if (layer.type === 'symbol' && layer.layout?.['icon-image']) safe('setPaintProperty', layer.id, 'icon-opacity', detailed ? .78 : .38);
  }
}

function syncVehicleMarkerPresentation(map) {
  const zoom = map.getZoom();
  // Viaturas são contexto operacional, não devem competir visualmente com ocorrências.
  // A escala cresce suavemente com o zoom, mas nunca regressa ao tamanho antigo.
  const scale = Math.max(.66, Math.min(1, .66 + (zoom - 6) * .035));
  const container = map.getContainer();
  container.style.setProperty('--map-vehicle-scale', scale.toFixed(3));
  container.dataset.vehicleDetail = zoom >= 14.25 ? 'full' : 'compact';
}

function positionAt(unit, travel) {
  const points = unit.route;
  const times = unit.route_times;
  if (!points?.length || !times?.length) return { position: [unit.lng, unit.lat], bearing: 0 };
  let low = 0, high = times.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (times[middle] <= travel) low = middle;
    else high = middle - 1;
  }
  const index = Math.min(low, points.length - 2);
  const [a, b] = [points[index], points[index + 1]];
  const span = times[index + 1] - times[index];
  const t = span > 0 ? Math.min(1, Math.max(0, (travel - times[index]) / span)) : 1;
  return { position: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
    bearing: Math.atan2((b[0] - a[0]) * Math.cos(a[1] * Math.PI / 180), b[1] - a[1]) * 180 / Math.PI };
}

const incidentSvg = body => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

const INCIDENT_ICON_SVG = {
  fire: incidentSvg('<path d="M12 22c4 0 7-2.7 7-6.5 0-4.8-3.8-7.6-6.7-11.5.1 3.5-2.1 5.2-3.5 6.7C7.5 12 6 13.6 6 16c0 3.4 2.6 6 6 6Z"/><path d="M10 18c0-1.5 1.2-2.6 2.3-3.8.1 1.6 1.7 2.4 1.7 4 0 1.1-.8 2-2 2s-2-.9-2-2.2Z"/>'),
  wildfire: incidentSvg('<path d="M7 20h10"/><path d="M12 20v-5"/><path d="M8 15h8l-2-3h2l-4-7-4 7h2Z"/><path d="M17.5 18.5c1.7-.9 2.5-2 2.5-3.4 0-1.7-1.3-2.8-2.2-4.1 0 1.2-.8 1.8-1.4 2.4-.5.5-1.1 1.2-1.1 2.2 0 1.4.9 2.5 2.2 2.9Z"/>'),
  road: incidentSvg('<path d="M5 17h14l-1-5-2-3H8l-2 3-1 5Z"/><path d="M7 17v2M17 17v2M6 13h12"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/>'),
  medical: incidentSvg('<path d="M3 12h4l2-4 3 8 2-4h7"/><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10Z"/>'),
  asphyxia: incidentSvg('<path d="M10 20c-3 0-5-2.2-5-5.2 0-2.5 1.2-6.2 3.8-8.8.8-.8 1.2-.5 1.2.7V12"/><path d="M14 20c3 0 5-2.2 5-5.2 0-2.5-1.2-6.2-3.8-8.8-.8-.8-1.2-.5-1.2.7V12"/><path d="M10 12c-1.7 0-3 1.3-3 3M14 12c1.7 0 3 1.3 3 3M12 4v11"/>'),
  cardiac: incidentSvg('<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10Z"/><path d="M7 13h3l1.5-3 2 6 1.5-3h2"/>'),
  neurology: incidentSvg('<path d="M9 5a3 3 0 0 0-3 3c0 .4.1.8.2 1.1A3.5 3.5 0 0 0 7 16a3 3 0 0 0 4 2.8V5.5A2.5 2.5 0 0 0 9 5Z"/><path d="M15 5a3 3 0 0 1 3 3c0 .4-.1.8-.2 1.1A3.5 3.5 0 0 1 17 16a3 3 0 0 1-4 2.8V5.5A2.5 2.5 0 0 1 15 5Z"/><path d="M8 10h3M13 9h3M8 15h3M13 14h3"/>'),
  obstetric: incidentSvg('<circle cx="12" cy="8" r="3"/><path d="M7 15c1.3-2.3 3-3.5 5-3.5s3.7 1.2 5 3.5"/><path d="M8 15c0 3 1.8 5 4 5s4-2 4-5"/><path d="M10 17h4"/>'),
  custody: incidentSvg('<circle cx="7.5" cy="12" r="3.5"/><circle cx="16.5" cy="12" r="3.5"/><path d="M11 12h2M4 9l-1-2M20 9l1-2"/>'),
  search: incidentSvg('<circle cx="10.5" cy="10.5" r="5.5"/><path d="M15 15l5 5"/>'),
  police: incidentSvg('<path d="M12 3 19 6v5c0 4.6-2.8 8-7 10-4.2-2-7-5.4-7-10V6l7-3Z"/><path d="M9 12h6M12 9v6"/>'),
  'public-order': incidentSvg('<path d="M12 3 19 6v5c0 4.6-2.8 8-7 10-4.2-2-7-5.4-7-10V6l7-3Z"/><circle cx="12" cy="9" r="2"/><path d="M8.5 15c.8-1.8 2-2.7 3.5-2.7s2.7.9 3.5 2.7"/>'),
  water: incidentSvg('<path d="M3 9c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2"/><path d="M3 15c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2"/>'),
  hazmat: incidentSvg('<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M8 15h8"/><path d="M10 18h.01M14 18h.01"/>'),
  explosives: incidentSvg('<circle cx="11" cy="13" r="6"/><path d="M15 8l2-2 2 2M18 6V3"/><path d="M8 13h6M11 10v6"/>'),
  weather: incidentSvg('<path d="M6 17h11a4 4 0 0 0 .5-8A6 6 0 0 0 6.4 7.5 4.5 4.5 0 0 0 6 17Z"/><path d="M13 13l-2 4h3l-2 4"/>'),
  rescue: incidentSvg('<path d="M5 14a7 7 0 0 1 14 0"/><path d="M3 14h18M8 14v-3M16 14v-3M6 18h12"/>'),
  rail: incidentSvg('<rect x="6" y="3" width="12" height="15" rx="3"/><path d="M8 8h8M9 18l-2 3M15 18l2 3"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/>'),
  air: incidentSvg('<path d="M3 14l18-5-7 7-1 5-2-4-5 1 2-4-5 0Z"/>'),
  bus: incidentSvg('<rect x="5" y="3" width="14" height="16" rx="3"/><path d="M7 8h10M7 13h10M8 19v2M16 19v2"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/>'),
  motorcycle: incidentSvg('<circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M9 17l3-6 2 6M10 13h5l2-3h2M12 11l-2-2H8"/>'),
  disaster: incidentSvg('<path d="M12 3 22 20H2L12 3Z"/><path d="M12 9v5M12 17h.01"/>'),
  multi: incidentSvg('<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><circle cx="12" cy="16" r="3"/><path d="M10 9.5l1 4M14 9.5l-1 4M10.5 15h-2M13.5 15h2"/>'),
};

function iconMarkup(kind, service) {
  if (INCIDENT_ICON_SVG[kind]) return INCIDENT_ICON_SVG[kind];
  return service === 'medical' ? INCIDENT_ICON_SVG.medical : service === 'police' ? INCIDENT_ICON_SVG.police : INCIDENT_ICON_SVG.fire;
}

function updateIncidentMarker(el, item) {
  const service = incidentPrimaryService(item);
  const kind = incidentMarkerKind(item);
  const state = incidentMapState(item);
  const statusLabel = incidentMapStatusLabel(item);
  const serviceMeta = SERVICE[service] || SERVICE.fire;
  el.style.setProperty('--marker-color', serviceMeta.ink);
  el.dataset.service = service;
  el.dataset.incidentKind = kind;
  el.dataset.incidentState = state;
  el.dataset.priority = String(item.priority || 3);
  el.title = `${item.title} · ${statusLabel}`;
  el.setAttribute('aria-label', `${item.title} · ${serviceMeta.name} · ${statusLabel} · ${item.address || item.district || 'Portugal'}`);

  const icon = el.querySelector('.geo-incident-icon');
  if (icon && icon.dataset.kind !== kind) {
    icon.dataset.kind = kind;
    icon.innerHTML = iconMarkup(kind, service);
  }

  const priority = el.querySelector('.geo-priority');
  if (priority) priority.className = `geo-priority priority-${item.priority || 3}`;

  const label = el.querySelector('.geo-incident-label');
  if (label) {
    const title = label.querySelector('strong');
    const meta = label.querySelector('span');
    if (title) title.textContent = item.title;
    if (meta) meta.textContent = `${serviceMeta.name} · ${statusLabel}`;
  }
}

function markerElement(kind, item) {
  const el = document.createElement(kind === 'incident' ? 'button' : 'div');
  el.className = `geo-marker geo-${kind}`;
  const service = kind === 'incident' ? incidentPrimaryService(item) : item.service;
  el.style.setProperty('--marker-color', (SERVICE[service] || SERVICE.fire).ink);
  el.dataset.testid = kind === 'incident' ? `map-incident-${item.number}` : kind === 'base' ? `map-base-${item.service}-${item.id}` : `moving-unit-${item.name}`;
  el.title = item.title || item.callsign || item.name;
  if (kind === 'incident') {
    el.type = 'button';

    const core = document.createElement('span');
    core.className = 'geo-incident-core';

    const icon = document.createElement('span');
    icon.className = 'geo-incident-icon';
    core.append(icon);

    const state = document.createElement('span');
    state.className = 'geo-incident-state';
    state.setAttribute('aria-hidden', 'true');

    const priority = document.createElement('i');
    priority.className = `geo-priority priority-${item.priority || 3}`;

    const label = document.createElement('span');
    label.className = 'geo-incident-label';
    const title = document.createElement('strong');
    const meta = document.createElement('span');
    label.append(title, meta);

    el.append(core, state, priority, label);
    updateIncidentMarker(el, item);
  } else if (kind === 'base') {
    el.textContent = { fire: 'B', medical: '+', police: 'P' }[item.service];
    el.setAttribute('aria-label', item.name);
  } else {
    el.dataset.service = item.service;
    el.dataset.status = item.status;
    const visual = document.createElement('span');
    visual.className = 'geo-vehicle-visual';
    const image = document.createElement('img');
    image.className = 'geo-vehicle-image';
    image.src = vehicleImage(item.vehicle_type);
    image.alt = '';
    image.draggable = false;
    image.decoding = 'async';
    const fallback = document.createElement('span');
    fallback.className = 'geo-vehicle-fallback';
    fallback.textContent = { fire: 'B', medical: '+', police: 'P' }[item.service];
    fallback.hidden = true;
    image.addEventListener('error', () => { image.hidden = true; fallback.hidden = false; });
    visual.append(image, fallback);
    const label = document.createElement('span');
    label.className = 'geo-vehicle-label';
    label.textContent = item.callsign || item.name;
    el.append(visual, label);
  }
  return el;
}

export const PortugalMap = ({ world, game, selected, onSelect, focusKey, theme, active = true }) => {
  const container = useRef(null), mapRef = useRef(null);
  const markers = useRef(new Map());
  const latest = useRef({ game, selected, onSelect, received: performance.now() });
  const [loaded, setLoaded] = useState(false), [error, setError] = useState('');
  const [retry, setRetry] = useState(0), [layers, setLayers] = useState(false), [unitsVisible, setUnitsVisible] = useState(true);
  const [detailed, setDetailed] = useState(false);
  useEffect(() => { latest.current = { game, selected, onSelect, received: performance.now() }; }, [game, selected, onSelect]);

  useEffect(() => {
    setLoaded(false); setError('');
    let map;
    try {
      map = new maplibregl.Map({ container: container.current, style: world.map_style,
        center: world.center, zoom: world.zoom, minZoom: 4, maxZoom: 18,
        maxBounds: [[-33, 30], [-4.5, 44.5]], attributionControl: false,
        pitch: 0, maxPitch: 45, renderWorldCopies: false });
      mapRef.current = map;
      map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'Rotas: OSRM · Tempos estimados' }), 'bottom-left');
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left');
      map.on('load', () => {
        calmCartography(map, false);
        syncVehicleMarkerPresentation(map);
        map.addSource('operational-routes', { type: 'geojson', data: EMPTY, lineMetrics: true });
        map.addLayer({ id: 'route-glow', type: 'line', source: 'operational-routes',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'selected'], 15, 11],
            'line-blur': 7, 'line-opacity': ['case', ['get', 'selected'], .2, .1] } });
        map.addLayer({ id: 'route-casing', type: 'line', source: 'operational-routes',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#071016', 'line-width': ['case', ['get', 'selected'], 8, 6],
            'line-opacity': ['case', ['get', 'selected'], .92, .76] } });
        map.addLayer({ id: 'route-lines', type: 'line', source: 'operational-routes',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'selected'], 4.6, 3.2],
            'line-opacity': ['case', ['get', 'selected'], 1, .66] } });
        map.addLayer({ id: 'route-core', type: 'line', source: 'operational-routes',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#f4fbff', 'line-width': ['case', ['get', 'selected'], 1.05, .7],
            'line-opacity': ['case', ['get', 'selected'], .5, .2] } });
        map.addLayer({ id: 'route-direction', type: 'symbol', source: 'operational-routes',
          layout: { 'symbol-placement': 'line', 'symbol-spacing': 72, 'text-field': '›', 'text-size': 15,
            'text-rotation-alignment': 'map', 'text-pitch-alignment': 'map', 'text-keep-upright': false,
            'text-allow-overlap': true, 'symbol-avoid-edges': true },
          paint: { 'text-color': ['get', 'color'], 'text-halo-color': '#071016',
            'text-halo-width': 1.4, 'text-opacity': ['case', ['get', 'selected'], .95, .58] } });
        setLoaded(true); setError('');
      });
      map.on('zoom', () => syncVehicleMarkerPresentation(map));
      map.on('error', event => {
        if (event.error?.message) setError('Não foi possível carregar parte da cartografia. Verifica a ligação ou tenta novamente.');
      });
      map.on('idle', () => { if (map.areTilesLoaded()) setError(''); });
      const observer = new ResizeObserver(() => map.resize());
      observer.observe(container.current);
      const activeMarkers = markers.current;
      return () => {
        observer.disconnect();
        activeMarkers.forEach(marker => marker.remove()); activeMarkers.clear();
        map.remove(); mapRef.current = null;
      };
    } catch (_) {
      setError('O mapa real necessita de WebGL e de acesso à cartografia. Não foi possível iniciar o mapa neste navegador.');
      if (map) map.remove();
    }
  }, [world, retry]);

  const themeFrom = theme?.from || 'night', themeTo = theme?.to || themeFrom, themeBlend = theme?.blend || 0;
  useEffect(() => {
    if (loaded && mapRef.current) {
      const map = mapRef.current;
      const palette = getMapThemePalette(themeFrom, themeTo, themeBlend);
      calmCartography(map, detailed, palette);
      // Route outlines and direction halos follow the canvas while service ink stays semantic.
      if (map.getLayer('route-casing')) map.setPaintProperty('route-casing', 'line-color', palette.background);
      if (map.getLayer('route-direction')) map.setPaintProperty('route-direction', 'text-halo-color', palette.background);
    }
  }, [loaded, detailed, themeFrom, themeTo, themeBlend]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    const visibleIncidents = game.incidents.filter(isIncidentVisibleOnMap);
    const entries = [
      ...game.bases.map(item => ({ kind: 'base', item })),
      ...visibleIncidents.map(item => ({ kind: 'incident', item })),
      ...(unitsVisible ? game.units.filter(u => u.status !== 'available').map(item => ({ kind: 'vehicle', item })) : []),
    ];

    // When several unresolved incidents share the same operational point,
    // fan them out in a small deterministic ring so none is hidden underneath another.
    const incidentOffsets = new Map();
    const incidentGroups = new Map();
    visibleIncidents.forEach(item => {
      const key = `${Number(item.lng).toFixed(5)}:${Number(item.lat).toFixed(5)}`;
      if (!incidentGroups.has(key)) incidentGroups.set(key, []);
      incidentGroups.get(key).push(item);
    });
    incidentGroups.forEach(group => {
      const ordered = [...group].sort((a,b) => (a.priority || 3) - (b.priority || 3) || String(a.id).localeCompare(String(b.id)));
      if (ordered.length === 1) {
        incidentOffsets.set(ordered[0].id, [0,0]);
        return;
      }
      const radius = Math.min(23, 15 + ordered.length * 1.5);
      ordered.forEach((item,index) => {
        const angle = -Math.PI / 2 + index * (Math.PI * 2 / ordered.length);
        incidentOffsets.set(item.id, [Math.cos(angle) * radius, Math.sin(angle) * radius]);
      });
    });

    const keep = new Set();
    for (const { kind, item } of entries) {
      const id = `${kind}-${item.id}`;
      keep.add(id);
      let marker = markers.current.get(id);
      if (!marker) {
        const element = markerElement(kind, item);
        if (kind === 'incident') element.addEventListener('click', event => { event.stopPropagation(); latest.current.onSelect(item.id); });
        marker = new maplibregl.Marker({ element, anchor: 'center' }).setLngLat([item.lng, item.lat]).addTo(map);
        markers.current.set(id, marker);
      }
      marker.setLngLat([item.lng, item.lat]);
      if (kind === 'incident') marker.setOffset(incidentOffsets.get(item.id) || [0,0]);
      const element = marker.getElement();
      element.classList.toggle('is-selected', kind === 'incident' && item.id === selected);
      element.dataset.lng = item.lng; element.dataset.lat = item.lat;
      if (kind === 'incident') {
        element.setAttribute('aria-pressed', String(item.id === selected));
        updateIncidentMarker(element, item);
      }
      if (kind === 'vehicle') {
        element.dataset.status = item.status;
        element.dataset.service = item.service;
        const image = element.querySelector('.geo-vehicle-image');
        const source = vehicleImage(item.vehicle_type);
        if (image && image.getAttribute('src') !== source) image.setAttribute('src', source);
        const { bearing } = positionAt(item, item.travel || 0);
        element.style.setProperty('--vehicle-heading', `${bearing}deg`);
      }
    }
    markers.current.forEach((marker, id) => { if (!keep.has(id)) { marker.remove(); markers.current.delete(id); } });
    map.getSource('operational-routes')?.setData({ type: 'FeatureCollection', features: game.units.filter(u => u.route?.length > 1 && ['enroute', 'returning', 'base_transfer'].includes(u.status)).map(u => ({ type: 'Feature', properties: { color: theme?.cssVars?.['--service-' + u.service] || SERVICE[u.service].color, service: u.service, status: u.status, selected: u.incident_id === selected }, geometry: { type: 'LineString', coordinates: u.route } })) });
  }, [game, selected, loaded, unitsVisible, theme?.cssVars]);

  useEffect(() => {
    if (!loaded || !active || !game.speed) return;
    let frame;
    const animate = now => {
      const snapshot = latest.current;
      if (!document.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const elapsed = Math.min(2, (now - snapshot.received) / 1000) * snapshot.game.speed;
        snapshot.game.units.forEach(unit => {
          const marker = markers.current.get(`vehicle-${unit.id}`);
          if (!marker || !['enroute', 'returning', 'base_transfer'].includes(unit.status)) return;
          const { position, bearing } = positionAt(unit, Math.min(unit.travel_total, unit.travel + elapsed));
          marker.setLngLat(position);
          const element = marker.getElement();
          element.dataset.lng = position[0]; element.dataset.lat = position[1];
          element.style.setProperty('--vehicle-heading', `${bearing}deg`);
        });
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [loaded, active, game.speed]);

  useEffect(() => {
    if (!focusKey || !selected || !loaded) return;
    const incident = latest.current.game.incidents.find(i => i.id === selected);
    if (incident) mapRef.current.flyTo({ center: [incident.lng, incident.lat], zoom: 15, duration: 700 });
  }, [focusKey, selected, loaded]);

  const navigateRegion = region => {
    if (region.bounds) mapRef.current?.fitBounds(region.bounds, { padding: 65, duration: 900 });
    else mapRef.current?.flyTo({ center: region.center, zoom: region.zoom, duration: 900 });
    setLayers(false);
  };
  return <section className={detailed ? 'map-section portugal-map map-detailed' : 'map-section portugal-map map-clean'} data-testid="city-map" data-map-renderer="maplibre-webgl" data-map-ready={loaded}>
    <div ref={container} className="geographic-canvas" data-testid="portugal-map-canvas" aria-label="Mapa geográfico real de Portugal, navegável" />
    {!loaded && !error && <div className="geo-map-loading" role="status"><span className="geo-loading-dot" />A carregar cartografia de Portugal…</div>}
    {error && <div className="geo-map-error" role="alert" data-testid="map-provider-error"><span>{error}</span><button onClick={() => setRetry(n => n + 1)}>Tentar novamente</button></div>}
    <div className="map-layer-wrap"><button data-testid="map-layers-button" className={`map-layer-button ${layers ? 'active' : ''}`} aria-label="Regiões e camadas do mapa" aria-expanded={layers} onClick={() => setLayers(!layers)}><Layers3 size={16} /><span>Camadas</span></button>{layers && <div className="layer-menu geo-regions-menu" data-testid="map-layers-menu"><span className="geo-menu-caption">TERRITÓRIO PORTUGUÊS</span>{world.regions.map(region => <button key={region.id} data-testid={`map-region-${region.id}`} onClick={() => navigateRegion(region)}>{region.name}<ArrowUpRight size={13} /></button>)}<div className="geo-style-control"><span>DETALHE DO MAPA</span><div><button className={!detailed ? 'active' : ''} onClick={() => setDetailed(false)}>Simplificado</button><button className={detailed ? 'active' : ''} onClick={() => setDetailed(true)}>Detalhado</button></div></div><label><input type="checkbox" checked={unitsVisible} onChange={event => setUnitsVisible(event.target.checked)} data-testid="layer-unidades" />Viaturas no mapa</label><small>Cartografia OpenStreetMap.<br />Bases e ocorrências de simulação.</small></div>}</div>
    <div className="map-zoom"><IconButton icon={Plus} label="Aproximar mapa" testId="map-zoom-in" onClick={() => mapRef.current?.zoomIn()} /><IconButton icon={Minus} label="Afastar mapa" testId="map-zoom-out" onClick={() => mapRef.current?.zoomOut()} /><span /><IconButton icon={LocateFixed} label="Centrar no Porto" testId="map-reset" onClick={() => navigateRegion(world.regions[0])} /></div>
    {!game.speed && <div className="paused-label" data-testid="game-paused-indicator">SIMULAÇÃO EM PAUSA</div>}
  </section>;
};
