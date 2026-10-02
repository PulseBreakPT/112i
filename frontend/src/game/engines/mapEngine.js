import { portugalHour, isPortugalNight } from './timeEngine';
const WEATHER = [
  {id:'clear',label:'Céu limpo',factor:1},
  {id:'rain',label:'Chuva',factor:1.18},
  {id:'storm',label:'Tempestade',factor:1.38},
  {id:'fog',label:'Nevoeiro',factor:1.25},
];

const TRAFFIC = [
  {id:'light',label:'Trânsito fluido',factor:1},
  {id:'moderate',label:'Trânsito moderado',factor:1.16},
  {id:'heavy',label:'Trânsito intenso',factor:1.34},
];

export const RISK_ZONES = {
  'porto-campanha': { fire: 1.25, medical: 1.05, police: 1.1, label: 'industrial' },
  'porto-foz': { fire: 1.2, medical: 1.15, police: 1, label: 'florestal e costeiro' },
  matosinhos: { fire: 1.2, medical: 1.1, police: 1.05, label: 'porto e indústria' },
  lisboa: { fire: 1.05, medical: 1.2, police: 1.2, label: 'metropolitano' },
  faro: { fire: 1.15, medical: 1.2, police: 1.1, label: 'turístico e aeroporto' },
  funchal: { fire: 1.15, medical: 1.1, police: 1.05, label: 'insular' },
};

const WEATHER_TRANSITIONS = {
  clear:['clear','clear','rain','fog'],
  rain:['rain','rain','clear','storm','fog'],
  storm:['storm','rain','rain','clear'],
  fog:['fog','clear','rain','fog'],
};

export const freshConditions = (elapsed, previous = null, random = Math.random, location = null) => {
  const previousWeather=previous?.weather||'clear';
  const options=WEATHER_TRANSITIONS[previousWeather]||WEATHER_TRANSITIONS.clear;
  const weatherId=options[Math.floor(random()*options.length)];
  const weather=WEATHER.find(item=>item.id===weatherId)||WEATHER[0];
  const hour=portugalHour(new Date());
  const rushHour=(hour>=7&&hour<=9)||(hour>=16&&hour<=19);
  const trafficRoll=random();
  const trafficId=rushHour?(trafficRoll<.55?'heavy':trafficRoll<.9?'moderate':'light'):(trafficRoll<.15?'heavy':trafficRoll<.55?'moderate':'light');
  const traffic=TRAFFIC.find(item=>item.id===trafficId)||TRAFFIC[0];
  const duration=1800+Math.floor(random()*5400);
  return {
    weather:weather.id,weather_label:weather.label,weather_factor:weather.factor,
    traffic:traffic.id,traffic_label:traffic.label,traffic_factor:traffic.factor,
    roadworks:previous?.roadworks?(random()<.72):(random()<.16),
    night:isPortugalNight(new Date(), location),updated_at:elapsed,next_change_at:elapsed+duration,
  };
};

export const conditionsFactor = c => (c?.weather_factor||1)*(c?.traffic_factor||1)*(c?.roadworks?1.12:1)*(c?.night?1.06:1);

export const distanceMeters = (a,b) => {
  const rad=n=>n*Math.PI/180, R=6371000, dLat=rad(b.lat-a.lat), dLng=rad(b.lng-a.lng);
  const q=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
};

export const routeTimes = (coordinates,duration) => {
  if(coordinates.length < 2) return [0];
  const lengths=coordinates.slice(1).map((point,index)=>distanceMeters(
    {lng:coordinates[index][0],lat:coordinates[index][1]},
    {lng:point[0],lat:point[1]},
  ));
  const total=lengths.reduce((sum,value)=>sum+value,0)||1;
  let covered=0;
  return [0,...lengths.map(length=>{covered+=length;return duration*covered/total;})];
};

export const reverseRoute = plan => {
  const coordinates=[...plan.coordinates].reverse();
  return {...plan,coordinates,times:routeTimes(coordinates,plan.duration)};
};

const roadRouteCache = new Map();

export async function fetchRoadRoute(points,originId,destinationId,conditions=null){
  const a=typeof originId==='string'?points[originId]:originId,b=typeof destinationId==='string'?points[destinationId]:destinationId;
  if(!a||!b) throw new Error('Localização desconhecida.');
  const pointKey=point=>point.id||`${Number(point.lng).toFixed(5)},${Number(point.lat).toFixed(5)}`;
  const key=`${pointKey(a)}:${pointKey(b)}`;
  let road=roadRouteCache.get(key);
  if(!road){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const coordinates=`${a.lng},${a.lat};${b.lng},${b.lat}`;
      const response=await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,{headers:{Accept:'application/json'},signal:controller.signal});
      if(!response.ok)throw new Error(`Serviço rodoviário indisponível (${response.status}).`);
      const payload=await response.json(),route=payload?.routes?.[0];
      if(payload?.code!=='Ok'||!route?.geometry?.coordinates?.length)throw new Error('Não existe um percurso rodoviário entre estes locais.');
      road={coordinates:route.geometry.coordinates,distance:Math.round(route.distance),duration:Math.max(1,Math.round(route.duration))};
      roadRouteCache.set(key,road);
    }catch(error){
      if(error?.name==='AbortError')throw new Error('O cálculo do percurso rodoviário demorou demasiado. Tenta novamente.');
      throw new Error(error?.message||'Não foi possível calcular o percurso rodoviário. Tenta novamente.');
    }finally{clearTimeout(timeout);}
  }
  const duration=Math.max(1,Math.round(road.duration*conditionsFactor(conditions)));
  return {...road,duration,times:routeTimes(road.coordinates,duration),source:'OSRM / OpenStreetMap'};
}