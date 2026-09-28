import { memo } from 'react';

const riverY = x => 790 - x * .23 + 58 * Math.sin(x / 185);
const riverPoints = Array.from({ length: 79 }, (_, i) => [-80 + i * 20, riverY(-80 + i * 20)]);
const riverPath = riverPoints.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
const parcels = [];

function roof(x, y, w, h, seed, key) {
  const tone = ['#343434', '#393939', '#303030', '#3c3c3c'][seed % 4];
  return <g key={key}>
    <rect x={x + 3} y={y + 4} width={w} height={h} rx="1" fill="#080808" opacity=".55" />
    <rect x={x} y={y} width={w} height={h} rx="1" fill={tone} stroke="#4b4b4b" strokeWidth=".55" />
    <path d={`M${x + 1} ${y + h - 1}V${y + 1}H${x + w - 1}`} fill="none" stroke="#6b6b6b" strokeWidth=".6" opacity=".55" />
    <rect x={x + 3} y={y + 3} width={Math.max(3, w - 6)} height={Math.max(3, h - 6)} fill="none" stroke="#252525" strokeWidth=".7" />
    {w > 18 && <><rect x={x + 6} y={y + 6} width="6" height="4" fill="#252525" stroke="#515151" strokeWidth=".5" /><path d={`M${x + 7} ${y + 7}h4m-4 1h4`} stroke="#777" strokeWidth=".4" /></>}
    {seed % 3 === 0 && <path d={`M${x + 3} ${y + h - 3}h${Math.max(3, w - 6)}`} stroke="#777" strokeWidth=".6" opacity=".4" />}
  </g>;
}

for (let row = 0; row < 12; row++) for (let col = 0; col < 17; col++) {
  const x = 60 + col * 80, y = 55 + row * 80;
  if (Math.abs(y + 40 - riverY(x + 40)) < 102) continue;
  const seed = col * 11 + row * 7;
  const park = (col >= 1 && col <= 3 && row >= 1 && row <= 2) || (col >= 10 && col <= 12 && row >= 6 && row <= 7) || (col === 7 && row < 3);
  if (park) {
    parcels.push(<g key={`park-${col}-${row}`}>
      <rect x={x + 8} y={y + 8} width="64" height="64" rx="5" fill="#242424" stroke="#393939" strokeWidth=".6" />
      <path d={`M${x + 10} ${y + 63}Q${x + 46} ${y + 60} ${x + 64} ${y + 12}M${x + 15} ${y + 17}Q${x + 27} ${y + 42} ${x + 65} ${y + 55}`} stroke="#474747" strokeWidth="2" fill="none" />
      {Array.from({ length: 19 }, (_, j) => { const tx = x + 14 + (j * 19 + seed) % 53, ty = y + 13 + (j * 31 + seed) % 54; return <g key={j}><ellipse cx={tx + 2} cy={ty + 2} rx="4.5" ry="3.3" fill="#101010" opacity=".5" /><circle cx={tx} cy={ty} r={3 + j % 3} fill={j % 2 ? '#363636' : '#303030'} stroke="#4b4b4b" strokeWidth=".45" /><circle cx={tx - 1} cy={ty - 1} r="1.5" fill="#505050" opacity=".5" /></g>; })}
    </g>);
    continue;
  }
  const buildings = [];
  if (col > 11 && row < 5) {
    buildings.push(roof(x + 12, y + 13, 52, 37, seed, 'warehouse'));
    for (let j = 0; j < 6; j++) buildings.push(<path key={`rib-${j}`} d={`M${x + 18 + j * 7} ${y + 16}v30`} stroke="#565656" strokeWidth="1" opacity=".65" />);
    buildings.push(<g key="parking" stroke="#555" strokeWidth=".6" opacity=".7"><path d={`M${x + 12} ${y + 60}h51`} />{[0, 1, 2, 3, 4, 5].map(j => <path key={j} d={`M${x + 14 + j * 9} ${y + 55}v10`} />)}</g>);
  } else if (seed % 4 === 0) {
    buildings.push(roof(x + 12, y + 12, 51, 15, seed, 'north'), roof(x + 12, y + 31, 16, 36, seed + 1, 'west'), roof(x + 48, y + 31, 15, 36, seed + 2, 'east'), roof(x + 31, y + 53, 14, 14, seed + 3, 'south'));
    buildings.push(<g key="courtyard"><rect x={x + 33} y={y + 32} width="10" height="16" fill="#252525" stroke="#424242" strokeWidth=".5" /><circle cx={x + 38} cy={y + 40} r="3.5" fill="#454545" stroke="#5b5b5b" strokeWidth=".7" /></g>);
  } else if (seed % 4 === 1) {
    buildings.push(roof(x + 13, y + 13, 23, 43, seed, 'tower-a'), roof(x + 43, y + 26, 23, 43, seed + 2, 'tower-b'));
    buildings.push(<path key="garden" d={`M${x + 15} ${y + 65}h20M${x + 43} ${y + 16}h20`} stroke="#414141" strokeWidth="3" />);
  } else if (seed % 4 === 2) {
    for (let j = 0; j < 6; j++) buildings.push(roof(x + 12 + j % 3 * 20, y + 12 + Math.floor(j / 3) * 30, 15 + j % 2 * 2, 22 + (j + row) % 4, seed + j, j));
  } else {
    buildings.push(roof(x + 12, y + 13, 33, 21, seed, 'shop'), roof(x + 51, y + 13, 15, 21, seed + 1, 'house'), roof(x + 12, y + 41, 21, 25, seed + 2, 'block-a'), roof(x + 40, y + 41, 26, 25, seed + 3, 'block-b'));
  }
  parcels.push(<g key={`parcel-${col}-${row}`}><rect x={x + 6} y={y + 6} width="68" height="68" rx="2" fill="#222222" stroke="#303030" strokeWidth=".65" />{buildings}</g>);
}

const districts = [
  { x: 238, y: 306, name: 'SÃO VICENTE', sub: 'BAIRRO RESIDENCIAL' },
  { x: 513, y: 396, name: 'BAIXA', sub: 'CENTRO HISTÓRICO' },
  { x: 820, y: 177, name: 'MONTE BELO', sub: '' },
  { x: 840, y: 411, name: 'SANTA CLARA', sub: 'DISTRITO CENTRAL' },
  { x: 1164, y: 198, name: 'PARQUE INDUSTRIAL', sub: '' },
  { x: 514, y: 910, name: 'MARGEM SUL', sub: '' },
  { x: 1140, y: 771, name: 'PORTO COMERCIAL', sub: 'ZONA PORTUÁRIA' },
];

const CityTerrain = memo(function CityTerrain({ world, detailed, labelsVisible }) {
  return <g className="polished-terrain">
    <defs>
      <pattern id="terrain-grain" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r=".35" fill="#777" opacity=".1" /><circle cx="5" cy="5" r=".3" fill="#000" opacity=".3" /></pattern>
      <pattern id="river-ripples" width="29" height="17" patternUnits="userSpaceOnUse"><path d="M2 5q5-2 10 0m4 6q5-2 10 0" stroke="#737373" strokeWidth=".45" opacity=".2" fill="none" /></pattern>
      <linearGradient id="river-depth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#171717" /><stop offset=".5" stopColor="#202020" /><stop offset="1" stopColor="#141414" /></linearGradient>
    </defs>
    <rect width="1400" height="1000" fill="#1c1c1c" />
    {detailed && parcels}
    <path d={riverPath} fill="none" stroke="#3a3a3a" strokeWidth="126" />
    <path d={riverPath} fill="none" stroke="#2b2b2b" strokeWidth="120" />
    <path d={riverPath} fill="none" stroke="#656565" strokeWidth="107" opacity=".65" />
    <path d={riverPath} fill="none" stroke="url(#river-depth)" strokeWidth="103" />
    <path d={riverPath} fill="none" stroke="url(#river-ripples)" strokeWidth="102" />
    <rect width="1400" height="1000" fill="url(#terrain-grain)" />
    {world.roads.map((road, i) => <g key={i}>
      <line x1={road.a.x} y1={road.a.y} x2={road.b.x} y2={road.b.y} stroke={road.bridge ? '#9b9b9b' : road.major ? '#575757' : '#383838'} strokeWidth={road.bridge ? 13 : road.major ? 11 : 5.5} />
      <line x1={road.a.x} y1={road.a.y} x2={road.b.x} y2={road.b.y} stroke={road.bridge ? '#353535' : road.major ? '#303030' : '#252525'} strokeWidth={road.bridge ? 10 : road.major ? 8.5 : 3.5} />
      {road.major && <line x1={road.a.x} y1={road.a.y} x2={road.b.x} y2={road.b.y} stroke="#b5b5b5" opacity=".35" strokeWidth=".65" strokeDasharray="5 8" />}
    </g>)}
    <g fill="none"><path d="M-30 95Q190 14 420 20T950 50T1490 2" stroke="#565656" strokeWidth="8" /><path d="M-30 95Q190 14 420 20T950 50T1490 2" stroke="#292929" strokeWidth="6" /><path d="M-30 95Q190 14 420 20T950 50T1490 2" stroke="#999" strokeWidth=".65" strokeDasharray="6 8" opacity=".5" /></g>
    {detailed && <>
      <g opacity=".75">{[1010, 1045, 1080, 1115].map(x => <g key={x} transform={`translate(${x},${riverY(x) + 45}) rotate(-9)`}><rect x="-4" y="-27" width="8" height="32" fill="#3d3d3d" stroke="#757575" strokeWidth=".8" /><path d="M-2 -23v24" stroke="#888" strokeWidth=".5" /></g>)}</g>
      {[440, 890, 1250].map((x, i) => <g key={x} transform={`translate(${x},${riverY(x) + (i - 1) * 20}) rotate(-17)`}><path d="M-11 0L-6-3H7L12 0L7 3H-6Z" fill="#656565" stroke="#868686" strokeWidth=".5" /><rect x="-5" y="-1.5" width="9" height="3" fill="#353535" /><path d="M-15 0h-14" stroke="#888" strokeWidth=".5" opacity=".25" /></g>)}
    </>}
    {labelsVisible && <g className="district-labels" textAnchor="middle">
      {districts.map(d => <g key={d.name}><text x={d.x} y={d.y} fill="#c3c3c3" fontSize="11" fontWeight="500" letterSpacing="2.4">{d.name}</text>{d.sub && <text x={d.x} y={d.y + 12} fill="#727272" fontSize="5" letterSpacing="1.6">{d.sub}</text>}</g>)}
      <text x="645" y="728" transform="rotate(-18 645 728)" fill="#787878" fontSize="20" fontStyle="italic" fontFamily="Georgia" letterSpacing="5">Rio Douro</text>
      <text x="850" y="286" fill="#7a7a7a" fontSize="6.5" letterSpacing=".6">AV. DOS DESCOBRIMENTOS</text>
      <text x="490" y="523" fill="#7a7a7a" fontSize="6.5" letterSpacing=".6">AVENIDA DA REPÚBLICA</text>
      <text x="238" y="219" fill="#878787" fontSize="6" letterSpacing=".6">JARDIM DE SÃO VICENTE</text>
      <text x="977" y="644" fill="#878787" fontSize="6" letterSpacing=".6">PARQUE FLORESTAL</text>
    </g>}
  </g>;
});

export default CityTerrain;
