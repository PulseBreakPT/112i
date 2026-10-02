import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Plus, Minus, LocateFixed, Layers3, ArrowUpRight, PhoneIncoming } from 'lucide-react';
import { SERVICE } from './common';
import { vehicleImage } from './vehicleMedia';
import { IconButton } from './Shell';
import 'maplibre-gl/dist/maplibre-gl.css';
import './PortugalMap.css';

maplibregl.setWorkerUrl(`${process.env.PUBLIC_URL || ''}/maplibre/maplibre-gl-worker.mjs`);

const EMPTY = { type: 'FeatureCollection', features: [] };

function calmCartography(map, detailed = false) {
  // Mantém a cartografia OpenStreetMap, mas trata-a como contexto operacional.
  if (!map.__distritoLayerState) {
    map.__distritoLayerState = Object.fromEntries(map.getStyle().layers.map(layer => [
      layer.id,
      { visibility: layer.layout?.visibility || 'visible', minzoom: layer.minzoom ?? 0, maxzoom: layer.maxzoom ?? 24 },
    ]));
  }
  const safe = (method, ...args) => { try { map[method](...args); } catch (_) {} };
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

    if (layer.type === 'background') safe('setPaintProperty', layer.id, 'background-color', detailed ? '#142027' : '#101a20');
    if (layer.type === 'fill') {
      const color = /water/.test(name) ? '#102c39' : /building/.test(name) ? '#263238' : /park|wood|forest|landcover|grass/.test(name) ? '#193029' : /industrial/.test(name) ? '#242d32' : '#19242a';
      safe('setPaintProperty', layer.id, 'fill-color', color);
      safe('setPaintProperty', layer.id, 'fill-opacity', detailed ? (/building/.test(name) ? .58 : .82) : (/building/.test(name) ? .24 : .62));
      if (/building/.test(name)) safe('setPaintProperty', layer.id, 'fill-outline-color', detailed ? '#39474d' : '#2a373d');
    }
    if (layer.type === 'line') {
      const color = /water/.test(name) ? '#284957' : isBoundary ? '#52626a' : isMajorRoad ? '#66757a' : isMidRoad ? '#526269' : isMinorRoad ? '#3b4b52' : /rail/.test(name) ? '#405057' : '#44545b';
      const opacity = detailed ? (isMajorRoad ? .88 : isMidRoad ? .68 : isMinorRoad ? .52 : .48) : (isMajorRoad ? .7 : isMidRoad ? .42 : isMinorRoad ? .2 : isBoundary ? .18 : .28);
      const width = isMajorRoad ? (detailed ? 2.5 : 1.7) : isMidRoad ? (detailed ? 1.8 : 1.1) : (detailed ? 1.15 : .72);
      safe('setPaintProperty', layer.id, 'line-color', color);
      safe('setPaintProperty', layer.id, 'line-opacity', opacity);
      safe('setPaintProperty', layer.id, 'line-width', ['interpolate', ['linear'], ['zoom'], 5, width * .55, 12, width, 18, width * 1.65]);
    }
    if (layer.type === 'symbol' && layer.layout?.['text-field']) {
      const labelColor = isPlace ? '#cbd4d6' : /road|highway/.test(name) ? '#829198' : '#91a0a6';
      safe('setPaintProperty', layer.id, 'text-color', labelColor);
      safe('setPaintProperty', layer.id, 'text-opacity', detailed ? (isPlace ? .9 : .72) : (isPlace ? .72 : .42));
      safe('setPaintProperty', layer.id, 'text-halo-color', '#101a20');
      safe('setPaintProperty', layer.id, 'text-halo-width', detailed ? 1.4 : 1.8);
      safe('setLayoutProperty', layer.id, 'text-size', isPlace ? (detailed ? 14 : 12) : (detailed ? 11 : 9.5));
    }
    if (layer.type === 'symbol' && layer.layout?.['icon-image']) safe('setPaintProperty', layer.id, 'icon-opacity', detailed ? .78 : .38);
  }
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

function markerElement(kind, item) {
  const el = document.createElement(kind === 'incident' ? 'button' : 'div');
  el.className = `geo-marker geo-${kind}`;
  el.style.setProperty('--marker-color', SERVICE[item.service].color);
  el.dataset.testid = kind === 'incident' ? `map-incident-${item.number}` : kind === 'base' ? `map-base-${item.service}-${item.id}` : `moving-unit-${item.name}`;
  el.title = item.title || item.name;
  if (kind === 'incident') {
    el.type = 'button';
    el.setAttribute('aria-label', `${item.title} · ${item.address}`);
    const number = document.createElement('span');
    number.className = 'geo-incident-number';
    number.textContent = item.number;
    el.append(number);
    const dot = document.createElement('i');
    dot.className = `geo-priority priority-${item.priority}`;
    el.append(dot);
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
    label.textContent = item.name;
    el.append(visual, label);
  }
  return el;
}

export const PortugalMap = ({ world, game, selected, onSelect, onCall, focusKey, active = true }) => {
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

  useEffect(() => {
    if (loaded && mapRef.current) calmCartography(mapRef.current, detailed);
  }, [loaded, detailed]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    const entries = [
      ...game.bases.map(item => ({ kind: 'base', item })),
      ...game.incidents.map(item => ({ kind: 'incident', item })),
      ...(unitsVisible ? game.units.filter(u => u.status !== 'available').map(item => ({ kind: 'vehicle', item })) : []),
    ];
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
      const element = marker.getElement();
      element.classList.toggle('is-selected', kind === 'incident' && item.id === selected);
      element.dataset.lng = item.lng; element.dataset.lat = item.lat;
      if (kind === 'incident') element.setAttribute('aria-pressed', String(item.id === selected));
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
    map.getSource('operational-routes')?.setData({ type: 'FeatureCollection', features: game.units.filter(u => u.route?.length > 1 && ['enroute', 'returning'].includes(u.status)).map(u => ({ type: 'Feature', properties: { color: SERVICE[u.service].color, service: u.service, status: u.status, selected: u.incident_id === selected }, geometry: { type: 'LineString', coordinates: u.route } })) });
  }, [game, selected, loaded, unitsVisible]);

  useEffect(() => {
    if (!loaded || !active || !game.speed) return;
    let frame;
    const animate = now => {
      const snapshot = latest.current;
      if (!document.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const elapsed = Math.min(2, (now - snapshot.received) / 1000) * snapshot.game.speed;
        snapshot.game.units.forEach(unit => {
          const marker = markers.current.get(`vehicle-${unit.id}`);
          if (!marker || !['enroute', 'returning'].includes(unit.status)) return;
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
  const call = game.incidents.find(i => !i.call_answered);
  return <section className={detailed ? 'map-section portugal-map map-detailed' : 'map-section portugal-map map-clean'} data-testid="city-map" data-map-renderer="maplibre-webgl" data-map-ready={loaded}>
    <div ref={container} className="geographic-canvas" data-testid="portugal-map-canvas" aria-label="Mapa geográfico real de Portugal, navegável" />
    {!loaded && !error && <div className="geo-map-loading" role="status"><span className="geo-loading-dot" />A carregar cartografia de Portugal…</div>}
    {error && <div className="geo-map-error" role="alert" data-testid="map-provider-error"><span>{error}</span><button onClick={() => setRetry(n => n + 1)}>Tentar novamente</button></div>}
    <div className="map-layer-wrap"><button data-testid="map-layers-button" className={`map-layer-button ${layers ? 'active' : ''}`} aria-label="Regiões e camadas do mapa" aria-expanded={layers} onClick={() => setLayers(!layers)}><Layers3 size={16} /></button>{layers && <div className="layer-menu geo-regions-menu" data-testid="map-layers-menu"><span className="geo-menu-caption">TERRITÓRIO PORTUGUÊS</span>{world.regions.map(region => <button key={region.id} data-testid={`map-region-${region.id}`} onClick={() => navigateRegion(region)}>{region.name}<ArrowUpRight size={13} /></button>)}<div className="geo-style-control"><span>DETALHE DO MAPA</span><div><button className={!detailed ? 'active' : ''} onClick={() => setDetailed(false)}>Simplificado</button><button className={detailed ? 'active' : ''} onClick={() => setDetailed(true)}>Detalhado</button></div></div><label><input type="checkbox" checked={unitsVisible} onChange={event => setUnitsVisible(event.target.checked)} data-testid="layer-unidades" />Viaturas no mapa</label><small>Cartografia OpenStreetMap.<br />Bases e ocorrências de simulação.</small></div>}</div>
    <div className="map-zoom"><IconButton icon={Plus} label="Aproximar mapa" testId="map-zoom-in" onClick={() => mapRef.current?.zoomIn()} /><IconButton icon={Minus} label="Afastar mapa" testId="map-zoom-out" onClick={() => mapRef.current?.zoomOut()} /><span /><IconButton icon={LocateFixed} label="Centrar no Porto" testId="map-reset" onClick={() => navigateRegion(world.regions[0])} /></div>
    <div className="map-bottom">{call && <button className="incoming-call" data-testid="incoming-call-button" onClick={() => onCall(call.id)}><span className="incoming-icon"><PhoneIncoming size={20} /></span><span><small>LINHA 112 · CHAMADA EM ESPERA</small><strong>Atender 112</strong></span><ArrowUpRight size={19} /></button>}</div>
    {!game.speed && <div className="paused-label" data-testid="game-paused-indicator">SIMULAÇÃO EM PAUSA</div>}
  </section>;
};
