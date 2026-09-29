export const operationalUnit = unit => unit.enabled!==false&&['available','patrol','staged'].includes(unit.status);

export function selectArrUnitIds(g,incidentId,arrId,{requireValue}){
  const inc=g.incidents.find(i=>i.id===incidentId),arr=g.arrs.find(item=>item.id===arrId);requireValue(inc&&arr,'Ocorrência ou regulamento inválido.');
  const pool=g.units.filter(unit=>operationalUnit(unit)&&unit.exclude_from_arr!==true&&unit.land===inc.land),chosen=[];
  for(const [type,count] of Object.entries(arr.vehicles||{}))pool.filter(unit=>unit.vehicle_type===type&&!chosen.includes(unit)).slice(0,count).forEach(unit=>chosen.push(unit));
  for(const [service,need] of Object.entries(inc.needs)){const already=g.units.filter(unit=>unit.incident_id===inc.id&&unit.service===service).length;const count=Math.min(Math.max(0,need-already),arr.resources[service]||0);const specific=(inc.required_vehicle_types||[]).map(type=>pool.find(unit=>unit.service===service&&unit.vehicle_type===type&&!chosen.includes(unit))).filter(Boolean);specific.slice(0,count).forEach(unit=>chosen.push(unit));pool.filter(unit=>unit.service===service&&!chosen.includes(unit)).slice(0,Math.max(0,count-specific.length)).forEach(unit=>chosen.push(unit));}
  requireValue(chosen.length,'O RAR não encontrou meios compatíveis disponíveis.');return chosen.map(unit=>unit.id);
}

export function selectRecommendedUnitIds(g,incidentId,mode='safe',{requireValue,distanceMeters,vehicleDefinition}){
  const inc=g.incidents.find(i=>i.id===incidentId);requireValue(inc,'Ocorrência inválida.');
  const assigned=g.units.filter(unit=>unit.incident_id===inc.id),chosen=[];
  const available=g.units.filter(unit=>operationalUnit(unit)&&unit.exclude_from_arr!==true&&unit.land===inc.land&&(unit.condition||100)>20&&(unit.fatigue||0)<90);
  const modeKey=['minimum','safe','full'].includes(mode)?mode:'safe';
  const serviceNeedMultiplier=modeKey==='minimum'?1:modeKey==='full'?1.6:inc.priority===1?1.35:1.15;
  const reserveWeight=modeKey==='full'?0:1;
  const score=unit=>{
    const definition=vehicleDefinition(unit.service,unit.vehicle_type),specialist=(inc.required_vehicle_types||[]).includes(unit.vehicle_type),trained=(unit.personnel_ids||[]).some(id=>{const person=(g.personnel||[]).find(item=>item.id===id);return (inc.required_trainings||[]).some(training=>(person?.qualifications||[]).includes(training));});
    return distanceMeters(unit,inc)+(unit.status==='staged'?-2500:0)+(unit.status==='patrol'?-1200:0)+(specialist?-3200:0)+(trained?-1400:0)+(definition?.training?-400:0)+(unit.fatigue||0)*90+(100-(unit.condition||100))*60;
  };
  const reserveOk=unit=>{
    const reserve=g.dispatch_policy?.reserve_by_service?.[unit.service]||0;
    return available.filter(candidate=>candidate.service===unit.service&&!chosen.includes(candidate)).length>reserve*reserveWeight;
  };
  const pickUnit=(predicate,required=true)=>{
    const unit=available.filter(unit=>!chosen.includes(unit)&&predicate(unit)&&reserveOk(unit)).sort((a,b)=>score(a)-score(b))[0]
      || available.filter(unit=>!chosen.includes(unit)&&predicate(unit)).sort((a,b)=>score(a)-score(b))[0];
    if(unit)chosen.push(unit);
    else if(required)throw new Error('Não há meios compatíveis suficientes para despacho recomendado.');
  };
  (inc.required_vehicle_types||[]).forEach(type=>pickUnit(unit=>unit.vehicle_type===type));
  (inc.required_trainings||[]).forEach(training=>pickUnit(unit=>(unit.personnel_ids||[]).some(id=>(g.personnel||[]).find(person=>person.id===id)?.qualifications?.includes(training))));
  Object.entries(inc.needs||{}).forEach(([service,count])=>{
    const already=assigned.filter(unit=>unit.service===service).length+chosen.filter(unit=>unit.service===service).length;
    const target=Math.ceil(count*serviceNeedMultiplier);
    for(let index=already;index<target;index++)pickUnit(unit=>unit.service===service,index<count);
  });
  requireValue(chosen.length,'Não há meios disponíveis para despacho recomendado.');
  return [...new Set(chosen.map(unit=>unit.id))];
}