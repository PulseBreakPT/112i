import { useMemo, useState } from 'react';
import { Clock3, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { SERVICE, duration, money } from './common';

export default function TrainingPanel({ game, world, act, busy }) {
  const firstCourse=world.training_catalog[0];
  const [course,setCourse]=useState(firstCourse?.id||'');
  const [trainingBase,setTrainingBase]=useState(game.bases.find(base=>base.service===firstCourse?.service)?.id||'');
  const [trainingCount,setTrainingCount]=useState(1);
  const trainings=game.trainings||[];
  const selectedCourse=world.training_catalog.find(item=>item.id===course);
  const compatibleBases=useMemo(()=>game.bases.filter(base=>base.service===selectedCourse?.service),[game.bases,selectedCourse]);
  const selectedTrainingBase=game.bases.find(base=>base.id===trainingBase);
  const facilities=game.facilities||[];
  const localAcademy=!!selectedTrainingBase&&facilities.some(facility=>facility.type==='academy'&&facility.command_center_id===selectedTrainingBase.command_center_id&&facility.enabled!==false&&(!facility.operational_at||facility.operational_at<=game.elapsed));
  const sharedAcademy=(game.cooperation?.support?.academy||0)>0;
  const academy=localAcademy||sharedAcademy;
  const trainingPrice=Math.round((selectedCourse?.cost||0)*Number(trainingCount)*(sharedAcademy&&!localAcademy ? .65 : .75));
  const run=async(kind,data,message)=>{const next=await act(kind,data);if(next&&message)toast.success(message);return next;};
  const chooseCourse=id=>{setCourse(id);const item=world.training_catalog.find(candidate=>candidate.id===id);setTrainingBase(game.bases.find(base=>base.service===item?.service)?.id||'');};

  return <section className="strategy-panel">
    <header><Users/><div><h2>Formação e qualificações</h2><p>Inscreve funcionários nos cursos exigidos pelos meios especializados.</p></div></header>
    <div className="training-console">
      <label>Curso<select value={course} onChange={event=>chooseCourse(event.target.value)}>{world.training_catalog.map(item=><option value={item.id} key={item.id}>{item.name} · {SERVICE[item.service].name}</option>)}</select></label>
      <label>Base<select value={trainingBase} onChange={event=>setTrainingBase(event.target.value)}>{compatibleBases.map(base=><option value={base.id} key={base.id}>{base.name}</option>)}</select></label>
      <label>Elementos<input type="number" min="1" max="5" value={trainingCount} onChange={event=>setTrainingCount(event.target.value)}/></label>
      <Button disabled={busy||!academy||!trainingBase} onClick={()=>run('start_training',{base_id:trainingBase,course,count:Number(trainingCount)},'Formação iniciada.')}><Users size={15}/>{academy?'Iniciar · '+money(trainingPrice):'Requer escola de formação'}</Button>
    </div>
    <div className="section-line"><h2>Formações em curso</h2><span>{trainings.filter(item=>item.status==='active').length} CURSOS</span></div>
    <div className="training-list">{trainings.filter(item=>item.status==='active').map(item=><article key={item.id}><Clock3 size={18}/><div><strong>{world.training_catalog.find(itemCourse=>itemCourse.id===item.course)?.name}</strong><small>{game.bases.find(base=>base.id===item.base_id)?.name} · {item.count} elemento(s)</small></div><b>{duration(item.completes_at-game.elapsed)}</b></article>)}{!trainings.some(item=>item.status==='active')&&<div className="operations-empty compact"><Users size={23}/><p>Sem formações em curso.</p></div>}</div>
    <div className="section-line"><h2>Qualificações disponíveis</h2><span>PESSOAL FORMADO</span></div>
    <div className="qualification-grid">{game.bases.map(base=><article key={base.id}><div><strong>{base.name}</strong><small>{Object.entries(base.qualifications||{}).filter(([,count])=>count).map(([id,count])=>(world.training_catalog.find(item=>item.id===id)?.name||id)+': '+count).join(' · ')||'Sem qualificações especializadas'}</small></div></article>)}</div>
  </section>;
}
