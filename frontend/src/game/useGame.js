import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WORLD, fetchRoadRoute, gamePoint, selectArrUnitIds, selectRecommendedUnitIds } from './localGame';
import { hasOperationalResources } from './engines/dispatchEngine';
import { localGameApi } from './gameApi';
import { operationalText, presentGameCopy, presentWorldCopy } from './operationalLanguage';
import { detectGameFeedback, failureFeedback } from './eventFeedback';

const DISPLAY_WORLD = presentWorldCopy(WORLD);

export function useGame() {
  const [game, setGame] = useState(() => localGameApi.load());
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const current = useRef(game);
  const feedbackSequence = useRef(0);

  const publishFeedback = useCallback(item => {
    if (item) setFeedback({ ...item, id: ++feedbackSequence.current });
  }, []);

  const update = useCallback((next, action = 'tick') => {
    const previous = current.current;
    const saved = localGameApi.save(next);
    current.current = saved;
    setGame(saved);
    publishFeedback(detectGameFeedback(previous, saved, action));
    return saved;
  }, [publishFeedback]);

  useEffect(() => { current.current = game; }, [game]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden || !current.current?.speed) return;
      update(localGameApi.tick(current.current, 2));
    }, 2000);
    return () => clearInterval(timer);
  }, [update]);

  const act = useCallback(async (requestedType, requestedData = {}) => {
    setBusy(true);
    try {
      let type=requestedType,data={...requestedData};
      if(type==='dispatch_arr'){
        data={incident_id:data.incident_id,unit_ids:selectArrUnitIds(current.current,data.incident_id,data.arr_id),via_arr:true};
        type='dispatch';
      }
      if(type==='dispatch_recommended'){
        data={incident_id:data.incident_id,unit_ids:selectRecommendedUnitIds(current.current,data.incident_id,data.mode),via_arr:true};
        type='dispatch';
      }
      if(type==='dispatch_group'){
        const group=current.current.unit_groups?.find(item=>item.id===data.group_id);
        if(!group)throw new Error('Grupo de meios inválido.');
        const incident=current.current.incidents.find(item=>item.id===data.incident_id),allowReturning=current.current.dispatch_policy?.allow_returning_redirect===true;
        const unitIds=group.unit_ids.filter(id=>current.current.units.some(unit=>{const base=current.current.bases.find(item=>item.id===unit.base_id);return unit.id===id&&unit.enabled!==false&&base?.enabled!==false&&(['available','patrol','staged'].includes(unit.status)||(allowReturning&&unit.status==='returning'))&&unit.land===incident?.land&&(unit.condition||100)>20&&(unit.fatigue||0)<90&&hasOperationalResources(unit);}));
        if(!unitIds.length)throw new Error('Nenhuma viatura deste grupo está disponível.');
        data={incident_id:data.incident_id,unit_ids:unitIds,via_arr:true};
        type='dispatch';
      }
      if(type==='dispatch'){
        const incident=current.current.incidents.find(item=>item.id===data.incident_id);
        if(!incident)throw new Error('Ocorrência já encerrada.');
        const prepared=data.routes||{};
        const plans=await Promise.all((data.unit_ids||[]).map(async id=>{
          const unit=current.current.units.find(item=>item.id===id);
          if(!unit)throw new Error('Unidade indisponível.');
          const base=current.current.bases.find(item=>item.id===unit.base_id);
          const outward=prepared[id]||await fetchRoadRoute({lng:unit.lng,lat:unit.lat},incident.node,current.current.conditions);
          const back=await fetchRoadRoute(incident.node,base.node,current.current.conditions);
          return [id,outward,back];
        }));
        data={...data,routes:Object.fromEntries(plans.map(([id,outward])=>[id,outward])),return_routes:Object.fromEntries(plans.map(([id,,back])=>[id,back]))};
      }
      if(type==='recall_unit'){
        const unit=current.current.units.find(item=>item.id===data.unit_id),base=unit&&current.current.bases.find(item=>item.id===unit.base_id);
        if(!unit||!base)throw new Error('Viatura ou base indisponível.');
        data={...data,route:await fetchRoadRoute({lng:unit.lng,lat:unit.lat},base.node,current.current.conditions)};
      }
      if(type==='redirect_unit'){
        const unit=current.current.units.find(item=>item.id===data.unit_id),incident=current.current.incidents.find(item=>item.id===data.incident_id),base=unit&&current.current.bases.find(item=>item.id===unit.base_id);
        if(!unit||!incident||!base)throw new Error('Viatura, ocorrência ou base indisponível.');
        const [route,returnRoute]=await Promise.all([fetchRoadRoute({lng:unit.lng,lat:unit.lat},incident.node,current.current.conditions),fetchRoadRoute(incident.node,base.node,current.current.conditions)]);
        data={...data,route,return_route:returnRoute};
      }
      if(type==='transport_patient'||type==='transport_prisoner'){
        const isPatient=type==='transport_patient';
        const task=(isPatient?current.current.patients:current.current.prisoners).find(item=>item.id===data[isPatient?'patient_id':'prisoner_id']);
        const facility=current.current.facilities.find(item=>item.id===data.facility_id),source=task&&gamePoint(task.source_node);
        const service=isPatient?'medical':'police';
        const eligible=unit=>{const base=current.current.bases.find(item=>item.id===unit.base_id),transportCapacity=isPatient?(unit.patient_capacity||0):(unit.detainee_capacity||0);return unit.service===service&&transportCapacity>0&&['available','patrol'].includes(unit.status)&&unit.enabled!==false&&base?.enabled!==false&&unit.land===source?.land&&hasOperationalResources(unit);};
        const requested=current.current.units.find(item=>item.id===data.unit_id),unit=requested&&eligible(requested)?requested:current.current.units.find(eligible);
        if(!task||!facility||!source||facility.land!==source.land||!unit)throw new Error(isPatient?'Sem ambulâncias compatíveis na mesma região.':'Sem viaturas policiais compatíveis na mesma região.');
        const base=current.current.bases.find(item=>item.id===unit.base_id);
        const [pickup,delivery,back]=await Promise.all([
          fetchRoadRoute({lng:unit.lng,lat:unit.lat},task.source_node,current.current.conditions),
          fetchRoadRoute(task.source_node,facility.node,current.current.conditions),
          fetchRoadRoute(facility.node,base.node,current.current.conditions),
        ]);
        data={...data,unit_id:unit.id,routes:{pickup,delivery,back}};
      }
      if(type==='transport_medical_transfer'){
        const transfer=current.current.medical_transfers?.find(item=>item.id===data.transfer_id),patient=transfer&&current.current.patients?.find(item=>item.id===transfer.patient_id),origin=patient&&current.current.facilities.find(item=>item.id===patient.hospital_id),facility=transfer&&current.current.facilities.find(item=>item.id===transfer.target_facility_id),source=transfer&&gamePoint(transfer.source_node);
        const eligible=unit=>{const base=current.current.bases.find(item=>item.id===unit.base_id);return unit.service==='medical'&&(unit.patient_capacity||0)>0&&['available','patrol'].includes(unit.status)&&unit.enabled!==false&&base?.enabled!==false&&unit.land===source?.land&&hasOperationalResources(unit);};
        const requested=current.current.units.find(item=>item.id===data.unit_id),unit=requested&&eligible(requested)?requested:current.current.units.find(eligible);
        if(!transfer||!patient||!origin||!facility||!source||origin.land!==facility.land||facility.land!==source.land||!unit)throw new Error('Sem meio médico compatível para a transferência.');
        const base=current.current.bases.find(item=>item.id===unit.base_id),[pickup,delivery,back]=await Promise.all([fetchRoadRoute({lng:unit.lng,lat:unit.lat},transfer.source_node,current.current.conditions),fetchRoadRoute(transfer.source_node,facility.node,current.current.conditions),fetchRoadRoute(facility.node,base.node,current.current.conditions)]);
        data={...data,unit_id:unit.id,routes:{pickup,delivery,back}};
      }
      if(type==='toggle_patrol'){
        const unit=current.current.units.find(item=>item.id===data.unit_id),base=unit&&current.current.bases.find(item=>item.id===unit.base_id);
        if(!unit||!base)throw new Error('Viatura policial indisponível.');
        if(unit.status==='patrol')data={...data,return_route:await fetchRoadRoute({lng:unit.lng,lat:unit.lat},base.node,current.current.conditions)};
        else{
          const points=WORLD.command_center_sites.filter(point=>point.city===base.city&&point.id!==base.node).slice(0,4);
          if(!points.length)throw new Error('Não existem pontos de patrulha nesta cidade.');
          const waypointIds=points.map(point=>point.id),legs=[],nodes=[base.node,...waypointIds];
          for(let index=0;index<waypointIds.length;index++)legs.push(await fetchRoadRoute(nodes[index],nodes[index+1],current.current.conditions));
          legs.push(await fetchRoadRoute(waypointIds[waypointIds.length-1],waypointIds[0],current.current.conditions));
          data={...data,waypoint_ids:[...waypointIds,waypointIds[0]],routes:legs};
        }
      }
      if(type==='deploy_to_staging'){
        const unit=current.current.units.find(item=>item.id===data.unit_id),staging=current.current.staging_areas?.find(item=>item.id===data.staging_id);
        if(!unit||!staging)throw new Error('Zona ou unidade indisponível.');
        data={...data,route:await fetchRoadRoute({lng:unit.lng,lat:unit.lat},{lng:staging.lng,lat:staging.lat},current.current.conditions)};
      }
      if(type==='return_from_staging'){
        const unit=current.current.units.find(item=>item.id===data.unit_id),base=unit&&current.current.bases.find(item=>item.id===unit.base_id);
        if(!unit||!base)throw new Error('A viatura não está numa zona de concentração.');
        data={...data,route:await fetchRoadRoute({lng:unit.lng,lat:unit.lat},base.node,current.current.conditions)};
      }
      return update(localGameApi.action(current.current, type, data), requestedType);
    } catch (error) {
      const message = operationalText(error?.message || 'Não foi possível concluir a ação. Tenta novamente.');
      publishFeedback(failureFeedback(message, requestedType));
      return null;
    } finally { setBusy(false); }
  }, [publishFeedback, update]);

  useEffect(() => {
    if (busy) return;
    const snapshot=current.current,policy=snapshot?.dispatch_policy;
    const patient=policy?.auto_patient_transport&&snapshot.patients?.find(item=>item.status==='waiting'&&item.treatment_complete);
    const patientSource=patient&&gamePoint(patient.source_node);
    const hospital=patient&&patientSource&&snapshot.facilities?.filter(item=>{
      const bonus=item.network_capacity_bonus||0,capacity=(item.capacity||0)+bonus,queue=(item.queue_limit||item.capacity||0)+bonus;
      const occupancy=(snapshot.patients||[]).filter(candidate=>(candidate.hospital_id===item.id&&['transporting','admitted'].includes(candidate.status))||(candidate.reserved_hospital_id===item.id&&['transfer_scheduled','transfer_transporting'].includes(candidate.status))).length;
      const specialtyOccupancy=(snapshot.patients||[]).filter(candidate=>candidate.hospital_id===item.id&&['transporting','admitted'].includes(candidate.status)&&(candidate.specialty===patient.specialty||patient.specialty==='urgency')).length;
      const specialtyCapacity=(item.specialty_capacity?.[patient.specialty]||0)+(patient.specialty==='urgency'?capacity:0);
      return item.type==='hospital'&&item.enabled!==false&&(!item.operational_at||item.operational_at<=snapshot.elapsed)&&item.land===patientSource.land&&occupancy<Math.min(capacity,queue)&&(specialtyCapacity>specialtyOccupancy||(item.specialties||[]).includes('urgency'));
    }).sort((a,b)=>Number(!(a.specialties||[]).includes(patient.specialty))-Number(!(b.specialties||[]).includes(patient.specialty)))[0];
    const prisoner=!patient&&policy?.auto_prisoner_transport&&snapshot.prisoners?.find(item=>item.status==='waiting');
    const prisonerSource=prisoner&&gamePoint(prisoner.source_node);
    const prison=prisoner&&prisonerSource&&snapshot.facilities?.find(item=>{
      const bonus=item.network_capacity_bonus||0,capacity=(item.capacity||0)+bonus,queue=(item.queue_limit||item.capacity||0)+bonus;
      const occupancy=(snapshot.prisoners||[]).filter(candidate=>candidate.prison_id===item.id&&['transporting','detained'].includes(candidate.status)).length;
      return item.type==='prison'&&item.enabled!==false&&(!item.operational_at||item.operational_at<=snapshot.elapsed)&&item.land===prisonerSource.land&&occupancy<Math.min(capacity,queue);
    });
    if(!patient&&!prisoner)return;
    const source=patientSource||prisonerSource,service=patient?'medical':'police';
    const transportReady=!!source&&snapshot.units?.some(unit=>{
      const base=snapshot.bases.find(item=>item.id===unit.base_id),capacity=patient?(unit.patient_capacity||0):(unit.detainee_capacity||0);
      return unit.service===service&&capacity>0&&['available','patrol'].includes(unit.status)&&unit.enabled!==false&&base?.enabled!==false&&unit.land===source.land&&hasOperationalResources(unit);
    });
    if(!transportReady||(patient&&!hospital)||(prisoner&&!prison))return;
    const timer=setTimeout(()=>{if(patient)act('transport_patient',{patient_id:patient.id,facility_id:hospital.id});else act('transport_prisoner',{prisoner_id:prisoner.id,facility_id:prison.id});},500);
    return()=>clearTimeout(timer);
  },[act,busy,game.elapsed,game.patients,game.prisoners,game.dispatch_policy,game.facilities]);


  const displayGame = useMemo(() => presentGameCopy(game), [game]);
  const clearFeedback = useCallback(id => setFeedback(currentFeedback => currentFeedback?.id === id ? null : currentFeedback), []);
  return { game: displayGame, world: DISPLAY_WORLD, error: game.save_warning || '', busy, act, retry: () => {}, feedback, clearFeedback };
}