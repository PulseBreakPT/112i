import { memo, useMemo, useEffect, useState } from 'react';

export function useSceneActivity(enabled) {
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return enabled && visible;
}

// Pick bounded paths from actual connected roads. No traffic simulation API or per-frame React work.
function streetLife(world) {
  const adjacency = new Map();
  world.roads.forEach(({ a, b }) => {
    if (!adjacency.has(a.id)) adjacency.set(a.id, []);
    if (!adjacency.has(b.id)) adjacency.set(b.id, []);
    adjacency.get(a.id).push(b);
    adjacency.get(b.id).push(a);
  });
  return Array.from({ length: 64 }, (_, index) => {
    let current = world.nodes[(index * 137 + 17) % world.nodes.length];
    let previous = null;
    const points = [current];
    let distance = 0;
    for (let step = 0; step < 5 + index % 5; step++) {
      const options = (adjacency.get(current.id) || []).filter(n => n.id !== previous?.id);
      if (!options.length) break;
      const next = options[(index * 7 + step * 3) % options.length];
      distance += Math.hypot(next.x - current.x, next.y - current.y);
      points.push(next);
      previous = current;
      current = next;
    }
    return { id: index, path: points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' '), duration: distance / (8 + index % 7) };
  });
}

export const UrbanLife = memo(function UrbanLife({ world, active }) {
  const cars = useMemo(() => streetLife(world), [world]);
  const walkers = useMemo(() => world.roads.filter(r => !r.bridge && !r.major).filter((_, i) => i % 43 === 0).slice(0, 28), [world]);
  return <g className={`urban-life ${active ? '' : 'scene-paused'}`} aria-hidden="true" pointerEvents="none" data-testid="urban-life" data-active={active}>
    {cars.map(car => <g key={car.id} className="ambient-car" style={{ offsetPath: `path('${car.path}')`, animationDuration: `${car.duration}s`, animationDelay: `${-car.id * 7.31}s` }}>
      <g transform="translate(0 2.1)"><rect x="-4.2" y="-1.35" width={car.id % 9 === 0 ? 11 : 8.4} height="2.7" rx=".8" fill={['#a8aaa7', '#62666a', '#858985', '#b4aba0'][car.id % 4]} /><rect x="-1.7" y="-1.05" width="3.2" height="2.1" rx=".4" fill="#353b40" /><path d="M3.6-1v.5m0 1v.5" stroke="#eee4c7" strokeWidth=".65" /></g>
    </g>)}
    {walkers.map((road, i) => <g key={i} className="ambient-walker" style={{ offsetPath: `path('M${road.a.x} ${road.a.y}L${road.b.x} ${road.b.y}')`, animationDuration: `${42 + i % 7 * 5}s`, animationDelay: `${-i * 9}s` }}><circle cy="6" r="1.05" fill="#aaa99f" />{i % 4 === 0 && <circle cx="-2.5" cy="7.5" r=".9" fill="#777e80" />}</g>)}
  </g>;
});

export const AtmosphericWeather = memo(function AtmosphericWeather({ world, active }) {
  return <g className={`atmospheric-weather ${active ? '' : 'scene-paused'}`} aria-hidden="true" pointerEvents="none" data-testid="atmospheric-weather" data-active={active}>
    <defs>
      <pattern id="light-rain" width="157" height="133" patternUnits="userSpaceOnUse"><g stroke="#c6d7dd" strokeWidth=".65" strokeLinecap="round"><path d="M15 11l-4 13M94 52l-3 10M49 105l-4 13M143 89l-3 9" /></g></pattern>
      <radialGradient id="soft-city-fog"><stop stopColor="#bfcdd0" stopOpacity=".12" /><stop offset=".55" stopColor="#b6c7cd" stopOpacity=".065" /><stop offset="1" stopColor="#b6c7cd" stopOpacity="0" /></radialGradient>
      <clipPath id="weather-bounds"><rect width={world.width} height={world.height} /></clipPath>
    </defs>
    <g clipPath="url(#weather-bounds)">
      <g className="city-mist"><ellipse cx={world.width * .25} cy={world.height * .38} rx="750" ry="280" fill="url(#soft-city-fog)" /><ellipse cx={world.width * .75} cy={world.height * .65} rx="900" ry="360" fill="url(#soft-city-fog)" /></g>
      <g className="city-drizzle"><rect className="rain-sheet" x="-180" y="-160" width={world.width + 360} height={world.height + 320} fill="url(#light-rain)" /></g>
    </g>
  </g>;
});
