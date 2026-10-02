import { useState } from 'react';
import { Layers3 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';

export default function OperationalComplexes({ game, act, busy }) {
  const centers=game.command_centers||[];
  const [complex,setComplex]=useState({name:'Complexo operacional',command_center_id:game.active_command_center_id||centers[0]?.id||''});
  const run=async(kind,data,message)=>{const next=await act(kind,data);if(next&&message)toast.success(message);return next;};
  return <section className="strategy-panel">
    <header><Layers3/><div><h2>Complexos operacionais</h2><p>Partilha capacidade e redistribui efetivo entre bases e instalações do mesmo polo.</p></div></header>
    <div className="strategy-form inline"><input value={complex.name} onChange={event=>setComplex({...complex,name:event.target.value})}/><select value={complex.command_center_id} onChange={event=>setComplex({...complex,command_center_id:event.target.value})}>{centers.map(center=><option key={center.id} value={center.id}>{center.name}</option>)}</select><Button onClick={()=>run('create_complex',complex,'Complexo criado.')} disabled={busy||!complex.name.trim()}><Layers3 size={14}/> Criar</Button></div>
    <div className="complex-grid">{(game.complexes||[]).map(item=><article key={item.id}><h3>{item.name}</h3><small>{item.shared?.garage_used||0}/{item.shared?.garage_capacity||0} garagens · {item.shared?.personnel||0} elementos · {item.shared?.beds||0} camas · {item.shared?.cells||0} celas</small><div>{game.bases.filter(base=>base.command_center_id===item.command_center_id).map(base=><label key={base.id}><input type="checkbox" checked={(item.base_ids||[]).includes(base.id)} onChange={()=>run('toggle_complex_member',{complex_id:item.id,member_kind:'base',member_id:base.id})}/>{base.name}</label>)}{(game.facilities||[]).filter(facility=>facility.command_center_id===item.command_center_id).map(facility=><label key={facility.id}><input type="checkbox" checked={(item.facility_ids||[]).includes(facility.id)} onChange={()=>run('toggle_complex_member',{complex_id:item.id,member_kind:'facility',member_id:facility.id})}/>{facility.name}</label>)}</div><Button disabled={(item.base_ids||[]).length<2} onClick={()=>run('rebalance_complex',{complex_id:item.id},'Efetivo redistribuído.')}>Equilibrar efetivo livre</Button></article>)}</div>
  </section>;
}
