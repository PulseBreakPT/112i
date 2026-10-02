import { BadgeCheck, CheckCircle2, Flag, LockKeyhole, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { money } from './common';
import { taskProgress } from './advancedSimulation';

export default function Career({ game, act, busy }) {
  const run=async(kind,data,message)=>{const next=await act(kind,data);if(next&&message)toast.success(message);return next;};
  const rotating=[...(game.rotating_tasks?.daily||[]),...(game.rotating_tasks?.weekly||[])];
  const careerTasks=game.tasks||[];
  const title=game.level===1?'Operador em formação':game.level<4?'Operador':'Coordenador de operações';
  return <main className="management-page strategy-page">
    <div className="page-heading"><div><span className="page-eyebrow">PERFIL DO OPERADOR</span><h1>Carreira</h1><p>Progressão, campanha, objetivos e marcos do teu percurso operacional.</p></div></div>
    <section className="strategy-hero">
      <div className="strategy-pulse"><i/><BadgeCheck size={27}/></div>
      <div><span>NÍVEL {game.level}</span><strong>{title}</strong><small>{game.xp} XP · {game.completed} ocorrências resolvidas · reputação {game.reputation||0} · capítulo {game.campaign?.chapter||1}</small></div>
      <div className="strategy-score"><Trophy/><b>{(game.achievements||[]).length}</b><span>marcos</span></div>
    </section>

    <div className="strategy-columns">
      <section className="strategy-panel"><header><CheckCircle2/><div><h2>Tutorial operacional</h2><p>Os passos essenciais para dominar a central.</p></div></header><div className="task-list">{(game.tutorial?.steps||[]).map(step=><article key={step.id} className={step.done?'done':''}><div className="task-icon">{step.done?<CheckCircle2/>:<Flag/>}</div><div><strong>{step.title}</strong><small>{step.done?'Concluído':'Por concluir'}</small></div></article>)}</div></section>
      <section className="strategy-panel"><header><Trophy/><div><h2>Campanha</h2><p>Objetivos de longo prazo para transformar a central numa rede nacional.</p></div></header><div className="task-list">{(game.campaign?.goals||[]).map(goal=><article key={goal.id} className={goal.done?'done':''}><div className="task-icon">{goal.done?<CheckCircle2/>:<Trophy/>}</div><div><strong>{goal.title}</strong><span><i style={{width:String(Math.min(100,goal.value/goal.target*100))+'%'}}/></span><small>Capítulo {game.campaign?.chapter||1} · {goal.value}/{goal.target}</small></div></article>)}</div></section>
    </div>

    <section className="strategy-panel"><header><Trophy/><div><h2>Objetivos diários e semanais</h2><p>Desafios de progressão com recompensas próprias.</p></div></header><div className="task-list">{rotating.map(task=>{const progress=taskProgress(game,task),done=progress>=task.target;return <article key={task.id} className={done?'done':''}><div className="task-icon">{done?<CheckCircle2/>:<Trophy/>}</div><div><strong>{task.title}</strong><span><i style={{width:String(Math.min(100,progress/task.target*100))+'%'}}/></span><small>{task.period==='daily'?'DIÁRIO':'SEMANAL'} · {progress}/{task.target} · {money(task.reward)}</small></div><Button disabled={busy||!done||task.claimed} onClick={()=>run('claim_rotating_task',{task_id:task.id},'Recompensa recebida.')}>{task.claimed?'Recebida':'Recolher'}</Button></article>})}</div><div className="event-banner">{(game.seasonal_events||[]).filter(item=>item.status==='active').map(event=><span key={event.id}><Flag size={14}/><b>{event.title}</b> · recompensas ×{event.reward_multiplier}</span>)}</div></section>

    {!!careerTasks.length && <section className="strategy-panel"><header><Flag/><div><h2>Objetivos de carreira</h2><p>Metas permanentes da campanha, separadas dos objetivos rotativos.</p></div></header><div className="task-list">{careerTasks.map(task=>{const progress=Math.min(task.target,Math.max(0,task.progress||0)),done=progress>=task.target;return <article key={task.id} className={done?'done':''}><div className="task-icon">{done?<CheckCircle2/>:<Flag/>}</div><div><strong>{task.title}</strong><span><i style={{width:String(Math.min(100,progress/task.target*100))+'%'}}/></span><small>CARREIRA · {progress}/{task.target} · {money(task.reward)}</small></div><Button disabled={busy||!done||task.claimed} onClick={()=>run('claim_task',{task_id:task.id},'Recompensa de carreira recebida.')}>{task.claimed?'Recebida':'Recolher'}</Button></article>})}</div></section>}

    {!!game.medals?.length && <section className="strategy-panel"><header><Trophy/><div><h2>Medalhas operacionais</h2><p>Reconhecimento por respostas excecionais em grandes ocorrências.</p></div></header><div className="milestones">{game.medals.slice(0,8).map(medal=><div key={medal.id} className="unlocked"><Trophy size={20}/><div><strong>{medal.title}</strong><p>{medal.incident}</p></div><span>{medal.score}/100</span></div>)}</div></section>}

    <section className="strategy-panel"><header><BadgeCheck/><div><h2>Marcos de carreira</h2><p>Registos permanentes do progresso do operador.</p></div></header><div className="milestones">{[[1,'Primeira resposta','Conclui a tua primeira ocorrência.'],[5,'Cinco intervenções','Resolve 5 ocorrências.'],[15,'Quinze intervenções','Resolve 15 ocorrências.']].map(([n,name,text])=><div key={n} className={game.completed>=n?'unlocked':''}>{game.completed>=n?<Trophy size={20}/>:<LockKeyhole size={20}/>}<div><strong>{name}</strong><p>{text}</p></div><span>{Math.min(n,game.completed)}/{n}</span></div>)}</div></section>
  </main>;
}
