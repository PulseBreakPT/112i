import { crewFatigue, vehicleAccessPenalty } from '../vehicleSystems';

export const operationalUnit = (unit, allowReturning = false) =>
  unit.enabled!==false && (['available','patrol','staged'].includes(unit.status) || (allowReturning && unit.status==='returning'));

const responseDistanceKm = (unit, incident, distanceMeters) =>
  distanceMeters ? distanceMeters(unit, incident) / 1000 : 0;

const withinResponseRange = (g, unit, incident, distanceMeters) => {
  if (!distanceMeters) return true;
  const policyMax = Number(g.dispatch_policy?.max_response_km) || Infinity;
  const unitMax = Number(unit.max_response_km) || policyMax;
  return responseDistanceKm(unit, incident, distanceMeters) <= Math.min(policyMax, unitMax);
};

export const hasOperationalResources = unit => {
  const resources=unit.resources||{};
  if((resources.fuel??100)<=5)return false;
  if(unit.service==='fire')return (resources.water??3000)>=150;
  if(unit.service==='medical')return (resources.oxygen??100)>=8&&(resources.medical??100)>=8;
  if(unit.service==='police')return (resources.equipment??100)>=8;
  return true;
};

const dispatchable = (g, unit, incident, distanceMeters) =>
  operationalUnit(unit, g.dispatch_policy?.allow_returning_redirect===true) &&
  g.bases.find(base=>base.id===unit.base_id)?.enabled!==false &&
  unit.exclude_from_arr!==true &&
  unit.auto_dispatch!==false &&
  unit.land===incident.land &&
  (unit.condition||100)>20 &&
  crewFatigue(g,unit)<90 &&
  hasOperationalResources(unit) &&
  withinResponseRange(g, unit, incident, distanceMeters);

export function selectArrUnitIds(g,incidentId,arrId,{requireValue,distanceMeters}){
  const inc=g.incidents.find(i=>i.id===incidentId),arr=g.arrs.find(item=>item.id===arrId);
  requireValue(inc&&arr,'Ocorrência ou regulamento inválido.');
  const pool=g.units.filter(unit=>dispatchable(g,unit,inc,distanceMeters)),chosen=[];
  const arrivalCost = unit => responseDistanceKm(unit,inc,distanceMeters)*1000+(Number(unit.response_delay)||0)*15+(unit.operational_reserve===true?250000:0)+(unit.maintenance_due===true?45000:0)-(Math.max(0,Math.min(100,Number(unit.dispatch_priority)||50))-50)*80;
  const byDistance = items => [...items].sort((a,b)=>arrivalCost(a)-arrivalCost(b));
  for(const [type,count] of Object.entries(arr.vehicles||{}))
    byDistance(pool.filter(unit=>unit.vehicle_type===type&&!chosen.includes(unit))).slice(0,count).forEach(unit=>chosen.push(unit));
  for(const [service,need] of Object.entries(inc.needs)){
    const already=g.units.filter(unit=>unit.incident_id===inc.id&&unit.service===service).length;
    const count=Math.min(Math.max(0,need-already),arr.resources[service]||0);
    const specific=(inc.required_vehicle_types||[])
      .map(type=>byDistance(pool.filter(unit=>unit.service===service&&unit.vehicle_type===type&&!chosen.includes(unit)))[0])
      .filter(Boolean);
    specific.slice(0,count).forEach(unit=>chosen.push(unit));
    byDistance(pool.filter(unit=>unit.service===service&&!chosen.includes(unit)))
      .slice(0,Math.max(0,count-specific.length)).forEach(unit=>chosen.push(unit));
  }
  requireValue(chosen.length,'O RAR não encontrou meios compatíveis dentro do raio operacional.');
  return chosen.map(unit=>unit.id);
}

export function selectRecommendedUnitIds(g,incidentId,mode='safe',{requireValue,distanceMeters,vehicleDefinition}){
  const inc=g.incidents.find(i=>i.id===incidentId);requireValue(inc,'Ocorrência inválida.');
  const assigned=g.units.filter(unit=>unit.incident_id===inc.id),chosen=[];
  const available=g.units.filter(unit=>dispatchable(g,unit,inc,distanceMeters));
  const modeKey=['minimum','safe','full'].includes(mode)?mode:'safe';
  const serviceNeedMultiplier=modeKey==='minimum'?1:modeKey==='full'?1.6:inc.priority===1?1.35:1.15;
  const reserveWeight=modeKey==='full'?0:1;
  const preferFastest=g.dispatch_policy?.prefer_fastest!==false;
  const score=unit=>{
    const definition=vehicleDefinition(unit.service,unit.vehicle_type);
    const aliases={urban:'urban-fire',industrial:'hazmat',criminal:'investigation',wildfire:'wildfire'};
    const capability=aliases[inc.specialization]||inc.specialization;
    const doctrineVehicles=[...(inc.required_vehicle_types||[]),...(inc.recommended_vehicle_types||[]),...(inc.support_vehicle_types||[])];
    const specialist=doctrineVehicles.includes(unit.vehicle_type)||(capability&&unit.capabilities?.includes(capability));
    const trained=(unit.personnel_ids||[]).some(id=>{
      const person=(g.personnel||[]).find(item=>item.id===id);
      return (inc.required_trainings||[]).some(training=>(person?.qualifications||[]).includes(training));
    });
    const distancePenalty=responseDistanceKm(unit,inc,distanceMeters)*1000*(preferFastest?1:.28);
    const preparationPenalty=(Number(unit.response_delay)||0)*(preferFastest?15:5);
    const fatigue=crewFatigue(g,unit);
    const recommended=Math.max(1,Number(unit.recommended_response_km)||Number(unit.max_response_km)||80);
    const distanceKm=responseDistanceKm(unit,inc,distanceMeters);
    const beyondRecommended=Math.max(0,distanceKm-recommended)*120;
    const reservePenalty=unit.operational_reserve===true?6500:0;
    const maintenancePenalty=unit.maintenance_due===true?2200:0;
    const priorityBonus=(Math.max(0,Math.min(100,Number(unit.dispatch_priority)||50))-50)*35;
    const accessPenalty=vehicleAccessPenalty(unit,inc,g.conditions);
    return distancePenalty+preparationPenalty+beyondRecommended+reservePenalty+maintenancePenalty+accessPenalty-priorityBonus+
      (unit.status==='staged'?-2500:0)+(unit.status==='patrol'?-1200:0)+(unit.status==='returning'?600:0)+
      (specialist?-3200:0)+(trained?-1400:0)+(definition?.training?-400:0)+
      fatigue*90+(100-(unit.condition||100))*60+(unit.wear||0)*28;
  };
  const reserveOk=unit=>{
    if(unit.operational_reserve===true&&available.some(candidate=>candidate.service===unit.service&&!chosen.includes(candidate)&&candidate.operational_reserve!==true))return false;
    const reserve=g.dispatch_policy?.reserve_by_service?.[unit.service]||0;
    return available.filter(candidate=>candidate.service===unit.service&&!chosen.includes(candidate)).length>reserve*reserveWeight;
  };
  const pickUnit=(predicate,required=true)=>{
    const unit=available.filter(unit=>!chosen.includes(unit)&&predicate(unit)&&reserveOk(unit)).sort((a,b)=>score(a)-score(b))[0]
      || available.filter(unit=>!chosen.includes(unit)&&predicate(unit)).sort((a,b)=>score(a)-score(b))[0];
    if(unit)chosen.push(unit);
    else if(required)throw new Error('Não há meios compatíveis suficientes dentro do raio operacional.');
  };
  (inc.required_vehicle_types||[]).forEach(type=>pickUnit(unit=>unit.vehicle_type===type));
  if(modeKey!=='minimum')(inc.recommended_vehicle_types||[]).forEach(type=>{if(!assigned.some(unit=>unit.vehicle_type===type)&&!chosen.some(unit=>unit.vehicle_type===type))pickUnit(unit=>unit.vehicle_type===type,false);});
  if(modeKey==='full')(inc.support_vehicle_types||[]).forEach(type=>{if(!assigned.some(unit=>unit.vehicle_type===type)&&!chosen.some(unit=>unit.vehicle_type===type))pickUnit(unit=>unit.vehicle_type===type,false);});
  (inc.required_trainings||[]).forEach(training=>pickUnit(unit=>(unit.personnel_ids||[]).some(id=>(g.personnel||[]).find(person=>person.id===id)?.qualifications?.includes(training))));
  Object.entries(inc.needs||{}).forEach(([service,count])=>{
    const already=assigned.filter(unit=>unit.service===service).length+chosen.filter(unit=>unit.service===service).length;
    const target=Math.ceil(count*serviceNeedMultiplier);
    for(let index=already;index<target;index++)pickUnit(unit=>unit.service===service,index<count);
  });
  requireValue(chosen.length,'Não há meios disponíveis para despacho recomendado.');
  return [...new Set(chosen.map(unit=>unit.id))];
}
