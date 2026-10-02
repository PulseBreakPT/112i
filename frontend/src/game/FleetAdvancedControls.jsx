import { Fuel, Route, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { STATUS } from './common';
import { crewFatigue } from './vehicleSystems';
import { RESOURCE_PROFILE } from './advancedSimulation';

export default function FleetAdvancedControls({ game, act, busy }) {
  const run=async(kind,data,message)=>{const next=await act(kind,data);if(next&&message)toast.success(message);return next;};
  return <>
    <div className="section-line"><h2>Controlos avançados da frota</h2><span>TURNOS · LOGÍSTICA · COBERTURA</span></div>
    <div className="unit-control-grid">{game.units.map(unit=><article key={unit.id}>
      <header><Settings2/><div><strong>{unit.callsign||unit.name}</strong><small>{unit.enabled===false?'Inativa':STATUS[unit.status]||unit.status} · {unit.on_shift===false?'fora de turno':'em turno'} · condição {Math.round(unit.condition||100)}% · desgaste {Math.round(unit.wear||0)}% · fadiga {Math.round(crewFatigue(game,unit))}%</small></div>{unit.status==='staged'&&<button onClick={()=>run('return_from_staging',{unit_id:unit.id},'Regresso iniciado.')}><Route size={13}/> Regressar</button>}</header>
      <label><input type="checkbox" checked={unit.enabled!==false} onChange={event=>run('update_unit_settings',{unit_id:unit.id,enabled:event.target.checked})}/> Ativa</label>
      <label><input type="checkbox" checked={unit.exclude_from_arr===true} onChange={event=>run('update_unit_settings',{unit_id:unit.id,exclude_from_arr:event.target.checked})}/> Excluir dos RAR</label>
      <label><input type="checkbox" checked={unit.auto_dispatch!==false} onChange={event=>run('update_advanced_unit',{unit_id:unit.id,auto_dispatch:event.target.checked})}/> Despacho automático</label>
      <label><input type="checkbox" checked={unit.operational_reserve===true} onChange={event=>run('update_advanced_unit',{unit_id:unit.id,operational_reserve:event.target.checked})}/> Reserva operacional</label>
      <label>Indicativo <input defaultValue={unit.callsign||unit.name} onBlur={event=>run('update_advanced_unit',{unit_id:unit.id,callsign:event.target.value})}/></label>
      <label>Turno <input type="number" min="0" max="23" value={unit.shift?.start||0} onChange={event=>run('update_advanced_unit',{unit_id:unit.id,shift:{start:event.target.value,end:unit.shift?.end||24}})}/><span>–</span><input type="number" min="1" max="24" value={unit.shift?.end||24} onChange={event=>run('update_advanced_unit',{unit_id:unit.id,shift:{start:unit.shift?.start||0,end:event.target.value}})}/></label>
      <label>Raio máximo <input type="number" min="1" max="300" value={unit.max_response_km||80} onChange={event=>run('update_advanced_unit',{unit_id:unit.id,max_response_km:event.target.value})}/> km</label>
      <label>Prioridade automática <input type="number" min="0" max="100" value={unit.dispatch_priority??50} onChange={event=>run('update_advanced_unit',{unit_id:unit.id,dispatch_priority:event.target.value})}/></label>
      <label><input type="checkbox" checked={unit.fixed_crew===true} onChange={event=>run('update_advanced_unit',{unit_id:unit.id,fixed_crew:event.target.checked})}/> Tripulação fixa</label>
      <label>Lotação <input type="number" min={unit.crew_required||1} max="12" value={unit.max_crew||unit.crew_required||1} onChange={event=>run('update_unit_settings',{unit_id:unit.id,max_crew:event.target.value})}/></label>
      <label>Atraso <input type="number" min="0" max="120" value={unit.response_delay||0} onChange={event=>run('update_unit_settings',{unit_id:unit.id,response_delay:event.target.value})}/> s</label>
      <div className="resource-strip"><Fuel size={12}/>{Object.entries(unit.resources||{}).map(([key,value])=><span key={key}>{RESOURCE_PROFILE[unit.service]?.[key]?.label||key}: {Math.round(value)}/{Math.round(unit.resource_capacity?.[key]??RESOURCE_PROFILE[unit.service]?.[key]?.capacity??100)}{RESOURCE_PROFILE[unit.service]?.[key]?.unit}</span>)}</div>
      <small>{Math.round(unit.mileage_km||0).toLocaleString('pt-PT')} km · {Number(unit.operating_hours||0).toFixed(1)} h · próxima revisão aos {Math.round(unit.next_maintenance_km||5000).toLocaleString('pt-PT')} km{unit.maintenance_due?' · REVISÃO EM ATRASO':''}</small>
      <div className="strategy-form inline"><Button disabled={busy||!['available','resting','offshift','uncrewed'].includes(unit.status)||(((unit.condition??100)>=99)&&((unit.wear||0)<=2)&&!unit.maintenance_due)} onClick={()=>run('repair_unit',{unit_id:unit.id},'Manutenção iniciada.')}>Manutenção</Button><Button disabled={busy||!['available','staged'].includes(unit.status)||(unit.fatigue||0)<20} onClick={()=>run('rest_unit',{unit_id:unit.id},'Descanso iniciado.')}>Descansar equipa</Button></div>
    </article>)}</div>
  </>;
}
