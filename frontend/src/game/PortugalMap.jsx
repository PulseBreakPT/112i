import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Plus, Minus, LocateFixed, Layers3, ArrowUpRight, PhoneIncoming } from 'lucide-react';
import { SERVICE } from './common';
import { IconButton } from './Shell';
import 'maplibre-gl/dist/maplibre-gl.css';
import './PortugalMap.css';

maplibregl.setWorkerUrl(`${process.env.PUBLIC_URL || ''}/maplibre/maplibre-gl-worker.mjs`);

const EMPTY = { type: 'FeatureCollection', features: [] };

function nightCartography(map) {
  // Restyle actual OpenStreetMap features. No generated terrain, roads or buildings.
  for (const layer of map.getStyle().layers) {
    const name = layer.id.toLowerCase();
    if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', '#172025');
    if (layer.type === 'fill') {
      const color = /water/.test(name) ? '#142e3b' : /building/.test(name) ? '#303b41' : /park|wood|forest|landcover|grass/.test(name) ? '#1e302c' : /industrial/.test(name) ? '#293034' : '#202a2f';
      map.setPaintProperty(layer.id, 'fill-color', color);
      if (/building/.test(name)) map.setPaintProperty(layer.id, 'fill-outline-color', '#435057');
    }
    if (layer.type === 'line') {
      const color = /water/.test(name) ? '#254b5e' : /boundary/.test(name) ? '#62717a' : /motorway|trunk/.test(name) ? '#85908c' : /primary|secondary/.test(name) ? '#69777b' : /path|rail/.test(name) ? '#405055' : '#485a64';
      map.setPaintProperty(layer.id, 'line-color', color);
    }
    if (layer.type === 'symbol' && layer.layout?.['text-field']) {
      map.setPaintProperty(layer.id, 'text-color', /place|city|town/.test(name) ? '#d6dfdf' : '#a0b2bd');
      map.setPaintProperty(layer.id, 'text-halo-color', '#172025');
      map.setPaintProperty(layer.id, 'text-halo-width', 1.5);
    }
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
    const body = document.createElement('span');
    body.className = 'geo-vehicle-body';
    const label = document.createElement('span');
    label.className = 'geo-vehicle-label';
    label.textContent = item.name;
    el.append(body, label);
  }
  return el;
}

export const PortugalMap = ({ world, game, selected, onSelect, onCall, focusKey, active = true }) => {
  const container = useRef(null), mapRef = useRef(null);
  const markers = useRef(new Map());
  const latest = useRef({ game, selected, onSelect, received: performance.now() });
  const [loaded, setLoaded] = useState(false), [error, setError] = useState('');
  const [retry, setRetry] = useState(0), [layers, setLayers] = useState(false), [unitsVisible, setUnitsVisible] = useState(true);
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
        nightCartography(map);
        map.addSource('operational-routes', { type: 'geojson', data: EMPTY });
        map.addLayer({ id: 'route-casing', type: 'line', source: 'operational-routes',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#0a1118', 'line-width': 7, 'line-opacity': .7 } });
        map.addLayer({ id: 'route-lines', type: 'line', source: 'operational-routes',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'selected'], 3.5, 2.5],
            'line-opacity': ['case', ['get', 'selected'], .9, .42] } });
        setLoaded(true); setError('');
      });
      map.on('error', event => {
        if (event.error?.message) setError('Não foi possível carregar parte da cartografia. Verifica a ligação ou tenta novamente.');
      });
      map.on('idle', () => { if (map.areTilesLoaded()) setError(''); });
      const observer = new ResizeObserver(() => map.resize());
      observer.observe(container.current);
      return () => {
        observer.disconnect();
        markers.current.forEach(marker => marker.remove()); markers.current.clear();
        map.remove(); mapRef.current = null;
      };
    } catch (_) {
      setError('O mapa real necessita de WebGL e de acesso à cartografia. Não foi possível iniciar o mapa neste navegador.');
      if (map) map.remove();
    }
  }, [world, retry]);

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
    }
    markers.current.forEach((marker, id) => { if (!keep.has(id)) { marker.remove(); markers.current.delete(id); } });
    map.getSource('operational-routes')?.setData({ type: 'FeatureCollection', features: game.units.filter(u => u.route?.length > 1 && ['enroute', 'returning'].includes(u.status)).map(u => ({ type: 'Feature', properties: { color: SERVICE[u.service].color, selected: u.incident_id === selected }, geometry: { type: 'LineString', coordinates: u.route } })) });
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
  return <section className="map-section portugal-map" data-testid="city-map" data-map-renderer="maplibre-webgl" data-map-ready={loaded}>
    <div ref={container} className="geographic-canvas" data-testid="portugal-map-canvas" aria-label="Mapa geográfico real de Portugal, navegável" />
    {!loaded && !error && <div className="geo-map-loading" role="status"><span className="geo-loading-dot" />A carregar cartografia de Portugal…</div>}
    {error && <div className="geo-map-error" role="alert" data-testid="map-provider-error"><span>{error}</span><button onClick={() => setRetry(n => n + 1)}>Tentar novamente</button></div>}
    <div className="map-layer-wrap"><button data-testid="map-layers-button" className={`map-layer-button ${layers ? 'active' : ''}`} aria-label="Regiões e camadas do mapa" aria-expanded={layers} onClick={() => setLayers(!layers)}><Layers3 size={16} /></button>{layers && <div className="layer-menu geo-regions-menu" data-testid="map-layers-menu"><span className="geo-menu-caption">TERRITÓRIO PORTUGUÊS</span>{world.regions.map(region => <button key={region.id} data-testid={`map-region-${region.id}`} onClick={() => navigateRegion(region)}>{region.name}<ArrowUpRight size={13} /></button>)}<label><input type="checkbox" checked={unitsVisible} onChange={event => setUnitsVisible(event.target.checked)} data-testid="layer-unidades" />Viaturas no mapa</label><small>Cartografia OpenStreetMap.<br />Bases e ocorrências de simulação.</small></div>}</div>
    <div className="map-zoom"><IconButton icon={Plus} label="Aproximar mapa" testId="map-zoom-in" onClick={() => mapRef.current?.zoomIn()} /><IconButton icon={Minus} label="Afastar mapa" testId="map-zoom-out" onClick={() => mapRef.current?.zoomOut()} /><span /><IconButton icon={LocateFixed} label="Centrar no Porto" testId="map-reset" onClick={() => navigateRegion(world.regions[0])} /></div>
    <div className="map-bottom">{call && <button className="incoming-call" data-testid="incoming-call-button" onClick={() => onCall(call.id)}><span className="incoming-icon"><PhoneIncoming size={20} /></span><span><small>LINHA 112 · CHAMADA EM ESPERA</small><strong>Atender 112</strong></span><ArrowUpRight size={19} /></button>}</div>
    {!game.speed && <div className="paused-label" data-testid="game-paused-indicator">SIMULAÇÃO EM PAUSA</div>}
  </section>;
};
