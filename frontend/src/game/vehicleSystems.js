import { PORTUGAL_ECONOMY, vehicleMaintenanceReserveRate } from './portugalEconomy';

// Sistema central de atributos e lógica das viaturas do Distrito 112.
// Mantém o catálogo, os saves antigos, o despacho e a manutenção a usar a mesma fonte de verdade.

const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,Number(value)||0));

const SERVICE_DEFAULTS={
  fire:{
    vehicle_class:'heavy',size_class:'large',speed_multiplier:.88,acceleration:42,maneuverability:45,offroad:45,weather_resistance:82,reliability:84,
    wear_rate:.0032,fuel_capacity_l:180,fuel_consumption_l_100km:31,operating_cost_per_km:.78,service_life_km:220000,preparation_time:32,recommended_response_km:35,max_response_km:80,
    cargo_capacity:900,patient_capacity:0,detainee_capacity:0,equipment_slots:5,maintenance_base_cost:220,maintenance_duration:150,
    resource_capacity:{water:3000,foam:300,fuel:100},capabilities:['fire-response'],equipment:['rádio TETRA','material de primeira intervenção']
  },
  medical:{
    vehicle_class:'medium',size_class:'medium',speed_multiplier:1.02,acceleration:68,maneuverability:72,offroad:20,weather_resistance:74,reliability:90,
    wear_rate:.0025,fuel_capacity_l:75,fuel_consumption_l_100km:13,operating_cost_per_km:.42,service_life_km:180000,preparation_time:18,recommended_response_km:30,max_response_km:70,
    cargo_capacity:320,patient_capacity:1,detainee_capacity:0,equipment_slots:4,maintenance_base_cost:170,maintenance_duration:120,
    resource_capacity:{oxygen:100,medical:100,fuel:100},capabilities:['medical-response'],equipment:['oxigénio','DAE','mala de emergência']
  },
  police:{
    vehicle_class:'light',size_class:'medium',speed_multiplier:1.06,acceleration:76,maneuverability:78,offroad:22,weather_resistance:72,reliability:88,
    wear_rate:.0023,fuel_capacity_l:65,fuel_consumption_l_100km:10,operating_cost_per_km:.34,service_life_km:190000,preparation_time:12,recommended_response_km:40,max_response_km:90,
    cargo_capacity:220,patient_capacity:0,detainee_capacity:2,equipment_slots:4,maintenance_base_cost:150,maintenance_duration:105,
    resource_capacity:{equipment:100,fuel:100},capabilities:['police-response'],equipment:['rádio TETRA','kit de sinalização']
  }
};

const OVERRIDES={
  'fire-engine':{vehicle_class:'heavy',speed_multiplier:.86,acceleration:38,maneuverability:43,offroad:38,reliability:86,fuel_capacity_l:200,fuel_consumption_l_100km:34,preparation_time:35,cargo_capacity:1200,resource_capacity:{water:3500,foam:350,fuel:100},capabilities:['urban-fire','rescue-basic','water-supply'],equipment:['mangueiras','equipamento respiratório','escadas portáteis'],equipment_slots:6},
  ladder:{vehicle_class:'special',size_class:'large',speed_multiplier:.80,acceleration:30,maneuverability:34,offroad:8,weather_resistance:70,reliability:82,fuel_capacity_l:220,fuel_consumption_l_100km:37,preparation_time:50,resource_capacity:{water:1400,foam:120,fuel:100},capabilities:['aerial','urban-fire'],equipment:['escada aérea','monitor de água'],equipment_slots:5},
  'wildfire-unit':{vehicle_class:'heavy',speed_multiplier:.84,acceleration:40,maneuverability:55,offroad:88,weather_resistance:90,reliability:87,fuel_capacity_l:190,fuel_consumption_l_100km:30,preparation_time:34,resource_capacity:{water:4000,foam:250,fuel:100},capabilities:['wildfire','offroad','water-supply'],equipment:['mangueiras florestais','ferramentas sapadoras'],equipment_slots:6},
  'light-wildfire':{vehicle_class:'medium',size_class:'medium',speed_multiplier:.96,acceleration:58,maneuverability:76,offroad:92,weather_resistance:86,reliability:88,fuel_capacity_l:110,fuel_consumption_l_100km:18,preparation_time:20,resource_capacity:{water:1200,foam:100,fuel:100},capabilities:['wildfire','offroad','rapid-response'],equipment:['mangueiras florestais','ferramentas sapadoras'],equipment_slots:5},
  'hazmat-unit':{vehicle_class:'special',speed_multiplier:.78,acceleration:32,maneuverability:38,offroad:25,weather_resistance:92,reliability:90,fuel_capacity_l:210,fuel_consumption_l_100km:32,preparation_time:65,cargo_capacity:1800,resource_capacity:{water:1000,foam:500,fuel:100},capabilities:['hazmat','decontamination'],equipment:['fatos químicos','detetores','descontaminação'],equipment_slots:8},
  'command-unit':{vehicle_class:'medium',speed_multiplier:.98,acceleration:63,maneuverability:65,offroad:35,reliability:92,fuel_capacity_l:95,fuel_consumption_l_100km:16,preparation_time:22,cargo_capacity:500,resource_capacity:{water:250,foam:0,fuel:100},capabilities:['command','communications'],equipment:['posto de comando','comunicações avançadas'],equipment_slots:6},
  tanker:{vehicle_class:'heavy',size_class:'large',speed_multiplier:.75,acceleration:24,maneuverability:28,offroad:52,weather_resistance:88,reliability:86,fuel_capacity_l:260,fuel_consumption_l_100km:41,preparation_time:45,cargo_capacity:700,resource_capacity:{water:9000,foam:400,fuel:100},capabilities:['water-supply','wildfire-support'],equipment:['bomba de grande caudal'],equipment_slots:4},
  'heavy-rescue':{vehicle_class:'heavy',speed_multiplier:.83,acceleration:37,maneuverability:40,offroad:30,reliability:89,fuel_capacity_l:210,fuel_consumption_l_100km:33,preparation_time:42,cargo_capacity:1700,resource_capacity:{water:800,foam:100,fuel:100},capabilities:['rescue','extrication'],equipment:['desencarcerador','almofadas pneumáticas','guincho'],equipment_slots:8},
  'aerial-platform':{vehicle_class:'special',size_class:'large',speed_multiplier:.77,acceleration:27,maneuverability:30,offroad:5,weather_resistance:68,reliability:84,fuel_capacity_l:230,fuel_consumption_l_100km:39,preparation_time:55,resource_capacity:{water:1200,foam:100,fuel:100},capabilities:['aerial','urban-fire'],equipment:['plataforma elevatória','monitor de água'],equipment_slots:5},

  ambulance:{vehicle_class:'medium',speed_multiplier:1.03,acceleration:70,maneuverability:73,reliability:91,preparation_time:18,patient_capacity:1,capabilities:['bls','patient-transport'],equipment:['oxigénio','DAE','imobilização','mala de trauma'],equipment_slots:5},
  vmer:{vehicle_class:'light',size_class:'small',speed_multiplier:1.12,acceleration:86,maneuverability:86,offroad:18,reliability:93,fuel_capacity_l:62,fuel_consumption_l_100km:11,preparation_time:10,cargo_capacity:180,patient_capacity:0,recommended_response_km:45,max_response_km:100,capabilities:['advanced-care','rapid-response'],equipment:['SAV','monitor-desfibrilhador','fármacos avançados'],equipment_slots:5},
  siv:{vehicle_class:'medium',speed_multiplier:1.05,acceleration:73,maneuverability:74,reliability:93,preparation_time:15,patient_capacity:1,resource_capacity:{oxygen:135,medical:150,fuel:100},capabilities:['advanced-care','patient-transport'],equipment:['monitor-desfibrilhador','fármacos','ventilação','trauma'],equipment_slots:6},
  umipe:{vehicle_class:'medium',speed_multiplier:1.04,acceleration:70,maneuverability:74,reliability:92,preparation_time:14,patient_capacity:0,resource_capacity:{oxygen:40,medical:80,fuel:100},capabilities:['psychological-support','crisis-intervention'],equipment:['material de apoio psicológico','comunicações','kit de crise'],equipment_slots:4},
  tip:{vehicle_class:'medium',speed_multiplier:1.00,acceleration:65,maneuverability:68,reliability:94,preparation_time:28,patient_capacity:1,resource_capacity:{oxygen:180,medical:200,fuel:100},capabilities:['pediatric-transport','advanced-care','patient-transport'],equipment:['incubadora pediátrica','ventilação','monitor pediátrico'],equipment_slots:7},
  'mass-casualty-unit':{vehicle_class:'special',size_class:'large',speed_multiplier:.77,acceleration:25,maneuverability:30,offroad:12,weather_resistance:82,reliability:90,fuel_capacity_l:190,fuel_consumption_l_100km:28,preparation_time:70,cargo_capacity:2400,patient_capacity:0,resource_capacity:{oxygen:300,medical:500,fuel:100},capabilities:['triage','mass-casualty','field-care'],equipment:['tendas médicas','triagem','oxigénio múltiplo'],equipment_slots:10},
  'patient-transport':{vehicle_class:'medium',speed_multiplier:.96,acceleration:58,maneuverability:68,reliability:92,fuel_capacity_l:75,fuel_consumption_l_100km:12,preparation_time:22,patient_capacity:2,resource_capacity:{oxygen:70,medical:60,fuel:100},capabilities:['patient-transport'],equipment:['cadeiras de transporte','maca'],equipment_slots:3},
  'medical-motorcycle':{vehicle_class:'light',size_class:'small',speed_multiplier:1.18,acceleration:95,maneuverability:96,offroad:28,weather_resistance:48,reliability:89,fuel_capacity_l:20,fuel_consumption_l_100km:5,preparation_time:6,cargo_capacity:55,patient_capacity:0,recommended_response_km:25,max_response_km:60,resource_capacity:{oxygen:25,medical:55,fuel:100},capabilities:['advanced-care','rapid-response'],equipment:['mala SAV','DAE compacto'],equipment_slots:2},
  'medical-helicopter':{vehicle_class:'air',size_class:'large',speed_multiplier:1.75,acceleration:90,maneuverability:80,offroad:100,weather_resistance:58,reliability:94,fuel_capacity_l:520,fuel_consumption_l_100km:115,preparation_time:95,cargo_capacity:450,patient_capacity:1,recommended_response_km:120,max_response_km:280,wear_rate:.0045,maintenance_base_cost:650,maintenance_duration:300,resource_capacity:{oxygen:180,medical:180,fuel:100},capabilities:['advanced-care','aeromedical','patient-transport'],equipment:['SAV','maca aeronáutica','monitor'],equipment_slots:6},

  patrol:{vehicle_class:'light',speed_multiplier:1.08,acceleration:80,maneuverability:82,reliability:90,preparation_time:10,detainee_capacity:2,capabilities:['patrol','first-response'],equipment:['sinalização','kit policial'],equipment_slots:4},
  'canine-unit':{vehicle_class:'medium',speed_multiplier:1.00,acceleration:65,maneuverability:68,offroad:45,reliability:91,fuel_capacity_l:80,fuel_consumption_l_100km:12,preparation_time:20,cargo_capacity:320,detainee_capacity:0,capabilities:['canine','search'],equipment:['transporte cinotécnico','material de busca'],equipment_slots:4},
  'riot-unit':{vehicle_class:'heavy',size_class:'large',speed_multiplier:.84,acceleration:38,maneuverability:42,weather_resistance:88,reliability:91,fuel_capacity_l:130,fuel_consumption_l_100km:22,preparation_time:40,cargo_capacity:950,detainee_capacity:0,capabilities:['public-order'],equipment:['escudos','proteção coletiva'],equipment_slots:7},
  'traffic-unit':{vehicle_class:'light',speed_multiplier:1.10,acceleration:84,maneuverability:84,reliability:90,preparation_time:9,detainee_capacity:1,capabilities:['traffic','rapid-response'],equipment:['cones','sinalização luminosa','etilómetro'],equipment_slots:4},
  'investigation-unit':{vehicle_class:'light',speed_multiplier:1.04,acceleration:72,maneuverability:78,reliability:92,preparation_time:12,detainee_capacity:0,capabilities:['investigation','evidence'],equipment:['kit forense','registo fotográfico','comunicações'],equipment_slots:5},
  'prisoner-van':{vehicle_class:'medium',speed_multiplier:.94,acceleration:55,maneuverability:60,reliability:92,fuel_capacity_l:90,fuel_consumption_l_100km:14,preparation_time:18,cargo_capacity:350,detainee_capacity:8,capabilities:['custody','prisoner-transport'],equipment:['cela de transporte','separação de detidos'],equipment_slots:3},
  'tactical-unit':{vehicle_class:'heavy',speed_multiplier:.88,acceleration:48,maneuverability:48,offroad:48,weather_resistance:90,reliability:93,fuel_capacity_l:140,fuel_consumption_l_100km:24,preparation_time:45,cargo_capacity:1200,detainee_capacity:4,capabilities:['tactical','public-order'],equipment:['proteção balística','aríete','escudos'],equipment_slots:8}
};

export function applyVehicleSpec(definition,service){
  const base=SERVICE_DEFAULTS[service]||SERVICE_DEFAULTS.police,override=OVERRIDES[definition.id]||{};
  const merged={...base,...definition,...override};
  merged.service=service;
  merged.price=PORTUGAL_ECONOMY.vehicles[definition.id] ?? definition.price ?? 0;
  const maintenanceRate=vehicleMaintenanceReserveRate(merged.vehicle_class);
  const fuelCostPerKm=(merged.fuel_consumption_l_100km||15)/100*PORTUGAL_ECONOMY.dieselPerLitre;
  const maintenancePerKm=merged.price*maintenanceRate/Math.max(1,merged.service_life_km||180000);
  const classOverhead=['heavy','special'].includes(merged.vehicle_class)?.16:merged.vehicle_class==='air'?.55:.08;
  merged.operating_cost_per_km=Math.max(Number(merged.operating_cost_per_km)||0,Number((fuelCostPerKm+maintenancePerKm+classOverhead).toFixed(2)));
  merged.maintenance_base_cost=Math.max(Number(merged.maintenance_base_cost)||0,Math.round(merged.price*maintenanceRate/4));
  merged.crew_min=Math.max(1,Number(definition.crew)||1);
  merged.crew_max=Math.max(merged.crew_min,Number(override.crew_max||definition.max_crew||definition.crew)||merged.crew_min);
  merged.resource_capacity={...base.resource_capacity,...(definition.resource_capacity||{}),...(override.resource_capacity||{})};
  merged.capabilities=[...new Set([...(base.capabilities||[]),...(definition.capabilities||[]),...(override.capabilities||[])])];
  merged.equipment=[...new Set([...(definition.equipment||[]),...(override.equipment||base.equipment||[])])].slice(0,merged.equipment_slots);
  merged.required_trainings=[...new Set([...(definition.required_trainings||[]),...(definition.training?[definition.training]:[])])];
  return merged;
}

export function fuelPercentForDistance(unit,distanceMeters,margin=0){
  const km=Math.max(0,Number(distanceMeters)||0)/1000;
  const capacity=Math.max(1,Number(unit.fuel_capacity_l)||70);
  const litres=km*Math.max(1,Number(unit.fuel_consumption_l_100km)||12)/100;
  return litres/capacity*100+Math.max(0,Number(margin)||0);
}

export function adjustedRoutePlan(unit,plan,status){
  if(!plan?.coordinates?.length||!Number.isFinite(Number(plan.duration)))return plan;
  const speed=Math.max(.55,Math.min(1.8,Number(unit.speed_multiplier)||1));
  const handlingFactor=1+Math.max(0,60-(Number(unit.maneuverability)||50))*.0018;
  const accelerationPenalty=Math.min(14,Math.max(0,70-(Number(unit.acceleration)||50))*.18);
  const movingDuration=Math.max(1,Number(plan.duration)/speed*handlingFactor+accelerationPenalty);
  const prep=['enroute','staging_enroute','base_transfer'].includes(status)?Math.max(0,Number(unit.preparation_time)||0)+Math.max(0,Number(unit.response_delay)||0):0;
  const rawTimes=Array.isArray(plan.times)&&plan.times.length===plan.coordinates.length?plan.times:plan.coordinates.map((_,index)=>Number(plan.duration)*index/Math.max(1,plan.coordinates.length-1));
  const rawDuration=Math.max(1,Number(plan.duration)||1),scale=movingDuration/rawDuration;
  const times=rawTimes.map(value=>prep+Math.max(0,Number(value)||0)*scale);
  return {...plan,duration:prep+movingDuration,times};
}

export function applyTripUsage(unit,distanceMeters,durationSeconds,status){
  const km=Math.max(0,Number(distanceMeters)||0)/1000;
  const fuel=fuelPercentForDistance(unit,distanceMeters);
  unit.resources=unit.resources||{};
  unit.resources.fuel=Math.max(0,(unit.resources.fuel??100)-fuel);
  unit.mileage_km=Math.max(0,Number(unit.mileage_km)||0)+km;
  unit.operating_hours=Math.max(0,Number(unit.operating_hours)||0)+Math.max(0,Number(durationSeconds)||0)/3600;
  if(status==='enroute')unit.emergency_distance_km=Math.max(0,Number(unit.emergency_distance_km)||0)+km;
  const wearGain=km*Math.max(.0005,Number(unit.wear_rate)||.0025);
  unit.wear=clamp((unit.wear||0)+wearGain);
  unit.condition=clamp((unit.condition??100)-wearGain*.38-km*.00035);
  unit.maintenance_due=(unit.mileage_km||0)>=(unit.next_maintenance_km||5000);
  return fuel;
}

export function crewFatigue(game,unit){
  const crew=(unit.personnel_ids||[]).map(id=>(game.personnel||[]).find(person=>person.id===id)).filter(Boolean);
  if(!crew.length)return clamp(unit.fatigue||0);
  return clamp(crew.reduce((sum,p)=>sum+(p.fatigue||0),0)/crew.length);
}

export function vehicleRatings(unit,definition=unit){
  const response=clamp((definition.speed_multiplier||1)*32+(definition.acceleration||50)*.25+(definition.maneuverability||50)*.22-Math.min(22,(definition.preparation_time||0)*.16));
  const robustness=clamp((definition.reliability||80)*.42+(definition.weather_resistance||60)*.25+(definition.offroad||20)*.12+(unit.condition??100)*.21-(unit.wear||0)*.12);
  const resources=Object.values(definition.resource_capacity||{}).reduce((sum,value)=>sum+(Number(value)||0),0);
  const capacity=clamp((definition.crew_max||definition.crew||2)*6+(definition.patient_capacity||0)*14+(definition.detainee_capacity||0)*4+(definition.equipment_slots||3)*5+Math.min(20,resources/260));
  const specialization=clamp(35+(definition.capabilities?.length||0)*9+(definition.required_trainings?.length||0)*10+(definition.equipment?.length||0)*3);
  const efficiency=clamp(100-(definition.fuel_consumption_l_100km||15)*1.15-(definition.maintenance_base_cost||150)/18+(definition.reliability||80)*.28);
  return {response:Math.round(response),robustness:Math.round(robustness),capacity:Math.round(capacity),specialization:Math.round(specialization),efficiency:Math.round(efficiency),reliability:Math.round(definition.reliability||80)};
}

export function maintenanceQuote(unit,definition=unit){
  const missing=Math.max(0,100-(unit.condition??100)),wear=Math.max(0,unit.wear||0),overdue=Math.max(0,(unit.mileage_km||0)-(unit.next_maintenance_km||5000));
  const cost=Math.max(definition.maintenance_base_cost||120,Math.round((definition.maintenance_base_cost||120)+missing*10+wear*4+overdue*.08));
  const duration=Math.round((definition.maintenance_duration||120)+missing*1.4+wear*.8+Math.min(240,overdue*.02));
  return {cost,duration,overdue};
}

export function resaleValue(unit,definition=unit,elapsed=0){
  const price=Math.max(0,Number(unit.purchase_price||definition.price)||0);
  const ageDays=Math.max(0,(Number(elapsed)-Number(unit.purchased_at||0))/86400);
  const ageFactor=Math.max(.42,1-ageDays*.0012);
  const conditionFactor=.45+.55*clamp(unit.condition??100)/100;
  const wearFactor=Math.max(.55,1-clamp(unit.wear||0)*.004);
  const mileageFactor=Math.max(.45,1-Math.max(0,unit.mileage_km||0)/Math.max(1,unit.service_life_km||definition.service_life_km||180000)*.55);
  return Math.max(0,Math.round(price*.78*ageFactor*conditionFactor*wearFactor*mileageFactor));
}

export function breakdownChance(unit,dt){
  const reliability=clamp(unit.reliability??85),condition=clamp(unit.condition??100),wear=clamp(unit.wear||0);
  const overdue=unit.maintenance_due?1:0,inspection=unit.inspection_overdue?1:0,lifeRatio=Math.max(0,(unit.mileage_km||0)/Math.max(1,unit.service_life_km||180000));
  const tyres=Math.max(0,45-clamp(unit.tyre_condition??100)),brakes=Math.max(0,45-clamp(unit.brake_condition??100)),battery=Math.max(0,40-clamp(unit.battery_condition??100));
  const age=Math.max(0,Number(unit.age_years)||0);
  const rate=.0000008+(100-reliability)*.0000012+Math.max(0,55-condition)*.0000025+wear*.0000007+overdue*.00002+inspection*.000028+
    Math.max(0,lifeRatio-.75)*.000035+tyres*.0000016+brakes*.0000018+battery*.000001+Math.max(0,age-12)*.0000014;
  return Math.min(.12,1-Math.exp(-Math.max(0,Number(dt)||0)*rate));
}

export function vehicleAccessPenalty(unit,incident,conditions){
  let penalty=0;
  if(incident?.specialization==='wildfire')penalty+=(100-(unit.offroad||20))*28;
  if(conditions?.weather==='storm')penalty+=(100-(unit.weather_resistance||60))*20;
  if(unit.size_class==='large'&&incident?.poi==='retail')penalty+=500;
  return penalty;
}

export function normalizeVehicleUnit(unit,definition,elapsed=0){
  const spec=applyVehicleSpec(definition,unit.service||definition.service);
  const defaults={
    vehicle_class:spec.vehicle_class,size_class:spec.size_class,speed_multiplier:spec.speed_multiplier,acceleration:spec.acceleration,maneuverability:spec.maneuverability,
    offroad:spec.offroad,weather_resistance:spec.weather_resistance,reliability:spec.reliability,wear_rate:spec.wear_rate,fuel_capacity_l:spec.fuel_capacity_l,
    fuel_consumption_l_100km:spec.fuel_consumption_l_100km,operating_cost_per_km:spec.operating_cost_per_km,service_life_km:spec.service_life_km,preparation_time:spec.preparation_time,recommended_response_km:spec.recommended_response_km,
    max_response_km:spec.max_response_km,cargo_capacity:spec.cargo_capacity,patient_capacity:spec.patient_capacity,detainee_capacity:spec.detainee_capacity,
    equipment_slots:spec.equipment_slots,equipment_installed:[...(spec.equipment||[])],capabilities:[...(spec.capabilities||[])],required_trainings:[...(spec.required_trainings||[])],
    resource_capacity:{...spec.resource_capacity},maintenance_base_cost:spec.maintenance_base_cost,maintenance_duration:spec.maintenance_duration,
    condition:100,wear:0,mileage_km:0,operating_hours:0,emergency_distance_km:0,missions_total:0,missions_success:0,critical_incidents:0,breakdowns:0,
    purchased_at:elapsed,purchase_price:spec.price,last_maintenance_at:elapsed,last_maintenance_km:0,next_maintenance_km:5000,maintenance_due:false,
    operational_reserve:false,auto_dispatch:true,dispatch_priority:50,maintenance_history:[],breakdown_history:[],billed_mileage_km:0
  };
  const merged={...defaults,...unit};
  if(!Number.isFinite(Number(unit.purchase_price)) || Number(unit.purchase_price)<spec.price*.25) merged.purchase_price=spec.price;
  merged.maintenance_base_cost=Math.max(defaults.maintenance_base_cost,Number(unit.maintenance_base_cost)||0);
  merged.operating_cost_per_km=Math.max(defaults.operating_cost_per_km,Number(unit.operating_cost_per_km)||0);
  merged.resource_capacity={...defaults.resource_capacity,...(unit.resource_capacity||{})};
  merged.equipment_installed=Array.isArray(unit.equipment_installed)?unit.equipment_installed:[...defaults.equipment_installed];
  merged.capabilities=Array.isArray(unit.capabilities)?unit.capabilities:[...defaults.capabilities];
  merged.required_trainings=Array.isArray(unit.required_trainings)?unit.required_trainings:[...defaults.required_trainings];
  merged.max_response_km=Number(unit.max_response_km)||spec.max_response_km;
  if(unit.billed_mileage_km==null)merged.billed_mileage_km=Number(unit.mileage_km)||0;
  return merged;
}
