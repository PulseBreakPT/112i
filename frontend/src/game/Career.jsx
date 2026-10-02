import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CheckCircle2, Flag, LockKeyhole, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { money } from './common';
import { taskProgress } from './advancedSimulation';
import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_GROUPS,
  ACHIEVEMENT_RARITIES,
  achievementMetricSnapshot,
  achievementProgress,
  achievementSummary,
} from './achievementEngine';
import './Career.css';

const progressValue = (value,achievement) => {
  const formatted=Math.max(0,Math.floor(value||0)).toLocaleString('pt-PT');
  return achievement.unit==='€'?formatted+' €':formatted;
};

export default function Career({ game, act, busy }) {
  const run=async(kind,data,message)=>{const next=await act(kind,data);if(next&&message)toast.success(message);return next;};
  const rotating=[...(game.rotating_tasks?.daily||[]),...(game.rotating_tasks?.weekly||[])];
  const careerTasks=game.tasks||[];
  const title=game.level===1?'Operador em formação':game.level<4?'Operador':'Coordenador de operações';
  const summary=achievementSummary(game);
  const metricSnapshot=useMemo(()=>achievementMetricSnapshot(game),[game]);
  const [achievementGroup,setAchievementGroup]=useState('all');
  const [achievementRarity,setAchievementRarity]=useState('all');
  const [achievementStatus,setAchievementStatus]=useState('all');
  const [achievementQuery,setAchievementQuery]=useState('');
  const [achievementLimit,setAchievementLimit]=useState(60);

  useEffect(()=>setAchievementLimit(60),[achievementGroup,achievementRarity,achievementStatus,achievementQuery]);

  const achievements=useMemo(()=>{
    const query=achievementQuery.trim().toLocaleLowerCase('pt-PT');
    return ACHIEVEMENT_CATALOG.map(item=>({...item,progress:achievementProgress(game,item,metricSnapshot)})).filter(item=>{
      if(achievementGroup!=='all'&&item.group!==achievementGroup)return false;
      if(achievementRarity!=='all'&&item.rarity!==achievementRarity)return false;
      if(achievementStatus==='unlocked'&&!item.progress.unlocked)return false;
      if(achievementStatus==='locked'&&item.progress.unlocked)return false;
      const haystack=[item.title,item.description,ACHIEVEMENT_GROUPS[item.group]||''].join(' ').toLocaleLowerCase('pt-PT');
      if(query&&!haystack.includes(query))return false;
      return true;
    });
  },[achievementGroup,achievementQuery,achievementRarity,achievementStatus,game,metricSnapshot]);

  return <main className="management-page strategy-page">
    <div className="page-heading"><div><span className="page-eyebrow">PERFIL DO OPERADOR</span><h1>Carreira</h1><p>Progressão, campanha, objetivos e marcos do teu percurso operacional.</p></div></div>
    <section className="strategy-hero">
      <div className="strategy-pulse"><i/><BadgeCheck size={27}/></div>
      <div><span>NÍVEL {game.level}</span><strong>{title}</strong><small>{game.xp} XP · {game.completed} ocorrências resolvidas · reputação {game.reputation||0} · capítulo {game.campaign?.chapter||1}</small></div>
      <div className="strategy-score"><Trophy/><b>{summary.unlocked}/{summary.total}</b><span>conquistas</span></div>
    </section>

    <div className="strategy-columns">
      <section className="strategy-panel"><header><CheckCircle2/><div><h2>Tutorial operacional</h2><p>Os passos essenciais para dominar a central.</p></div></header><div className="task-list">{(game.tutorial?.steps||[]).map(step=><article key={step.id} className={step.done?'done':''}><div className="task-icon">{step.done?<CheckCircle2/>:<Flag/>}</div><div><strong>{step.title}</strong><small>{step.done?'Concluído':'Por concluir'}</small></div></article>)}</div></section>
      <section className="strategy-panel"><header><Trophy/><div><h2>Campanha</h2><p>Objetivos de longo prazo para transformar a central numa rede nacional.</p></div></header><div className="task-list">{(game.campaign?.goals||[]).map(goal=><article key={goal.id} className={goal.done?'done':''}><div className="task-icon">{goal.done?<CheckCircle2/>:<Trophy/>}</div><div><strong>{goal.title}</strong><span><i style={{width:String(Math.min(100,goal.value/goal.target*100))+'%'}}/></span><small>Capítulo {game.campaign?.chapter||1} · {goal.value}/{goal.target}</small></div></article>)}</div></section>
    </div>

    <section className="strategy-panel"><header><Trophy/><div><h2>Objetivos diários e semanais</h2><p>Desafios de progressão com recompensas próprias.</p></div></header><div className="task-list">{rotating.map(task=>{const progress=taskProgress(game,task),done=progress>=task.target;return <article key={task.id} className={done?'done':''}><div className="task-icon">{done?<CheckCircle2/>:<Trophy/>}</div><div><strong>{task.title}</strong><span><i style={{width:String(Math.min(100,progress/task.target*100))+'%'}}/></span><small>{task.period==='daily'?'DIÁRIO':'SEMANAL'} · {progress}/{task.target} · {money(task.reward)}</small></div><Button disabled={busy||!done||task.claimed} onClick={()=>run('claim_rotating_task',{task_id:task.id},'Recompensa recebida.')}>{task.claimed?'Recebida':'Recolher'}</Button></article>})}</div><div className="event-banner">{(game.seasonal_events||[]).filter(item=>item.status==='active').map(event=><span key={event.id}><Flag size={14}/><b>{event.title}</b> · recompensas ×{event.reward_multiplier}</span>)}</div></section>

    {!!careerTasks.length && <section className="strategy-panel"><header><Flag/><div><h2>Objetivos de carreira</h2><p>Metas permanentes da campanha, separadas dos objetivos rotativos.</p></div></header><div className="task-list">{careerTasks.map(task=>{const progress=Math.min(task.target,Math.max(0,task.progress||0)),done=progress>=task.target;return <article key={task.id} className={done?'done':''}><div className="task-icon">{done?<CheckCircle2/>:<Flag/>}</div><div><strong>{task.title}</strong><span><i style={{width:String(Math.min(100,progress/task.target*100))+'%'}}/></span><small>CARREIRA · {progress}/{task.target} · {money(task.reward)}</small></div><Button disabled={busy||!done||task.claimed} onClick={()=>run('claim_task',{task_id:task.id},'Recompensa de carreira recebida.')}>{task.claimed?'Recebida':'Recolher'}</Button></article>)}</div></section>}

    {!!game.medals?.length && <section className="strategy-panel"><header><Trophy/><div><h2>Medalhas operacionais</h2><p>Reconhecimento por respostas excecionais em grandes ocorrências.</p></div></header><div className="milestones">{game.medals.slice(0,8).map(medal=><div key={medal.id} className="unlocked"><Trophy size={20}/><div><strong>{medal.title}</strong><p>{medal.incident}</p></div><span>{medal.score}/100</span></div>)}</div></section>}

    <section className="strategy-panel achievements-panel">
      <header><BadgeCheck/><div><h2>Conquistas</h2><p>1.000 marcos permanentes. As recompensas são atribuídas automaticamente quando cumpres cada objetivo.</p></div></header>

      <div className="achievement-summary">
        <div><span>DESBLOQUEADAS</span><strong>{summary.unlocked}</strong><small>de {summary.total}</small></div>
        <div><span>POR CONQUISTAR</span><strong>{summary.locked}</strong><small>{Math.round(summary.unlocked/summary.total*100)}% concluído</small></div>
        <div><span>DINHEIRO RECEBIDO</span><strong>{money(summary.money_awarded)}</strong><small>recompensas de conquistas</small></div>
        <div><span>XP RECEBIDO</span><strong>{summary.xp_awarded.toLocaleString('pt-PT')} XP</strong><small>progressão adicional</small></div>
      </div>

      <div className="achievement-toolbar">
        <input value={achievementQuery} onChange={event=>setAchievementQuery(event.target.value)} placeholder="Pesquisar conquistas…" aria-label="Pesquisar conquistas"/>
        <select value={achievementGroup} onChange={event=>setAchievementGroup(event.target.value)} aria-label="Filtrar por grupo">
          <option value="all">Todos os grupos</option>
          {Object.entries(ACHIEVEMENT_GROUPS).map(([id,label])=><option key={id} value={id}>{label}</option>)}
        </select>
        <select value={achievementRarity} onChange={event=>setAchievementRarity(event.target.value)} aria-label="Filtrar por raridade">
          <option value="all">Todas as raridades</option>
          {Object.entries(ACHIEVEMENT_RARITIES).map(([id,rarity])=><option key={id} value={id}>{rarity.label}</option>)}
        </select>
        <select value={achievementStatus} onChange={event=>setAchievementStatus(event.target.value)} aria-label="Filtrar por estado">
          <option value="all">Todas</option>
          <option value="unlocked">Desbloqueadas</option>
          <option value="locked">Por conquistar</option>
        </select>
      </div>

      <div className="achievement-result-line"><span>{achievements.length.toLocaleString('pt-PT')} conquistas</span><small>Dinheiro e XP calibrados para progressão longa, sem substituir a receita das operações.</small></div>

      <div className="achievement-list">
        {achievements.slice(0,achievementLimit).map(achievement=>{
          const {progress}=achievement;
          return <article key={achievement.id} className={'achievement-card '+(progress.unlocked?'unlocked':'locked')} data-rarity={achievement.rarity}>
            <div className="achievement-icon">{progress.unlocked?<Trophy size={18}/>:<LockKeyhole size={18}/>}</div>
            <div className="achievement-copy">
              <div className="achievement-title-line"><strong>{achievement.title}</strong><span>{achievement.rarity_label}</span></div>
              <p>{achievement.description}</p>
              <div className="achievement-progress"><i style={{width:String(progress.ratio*100)+'%'}}/></div>
              <small>{progressValue(progress.value,achievement)} / {progressValue(progress.target,achievement)} · {ACHIEVEMENT_GROUPS[achievement.group]}</small>
            </div>
            <div className="achievement-reward"><b>+{money(achievement.reward_money)}</b><span>+{achievement.reward_xp} XP</span>{progress.unlocked&&<small>RECEBIDA</small>}</div>
          </article>;
        })}
      </div>

      {!achievements.length&&<div className="achievement-empty">Nenhuma conquista corresponde aos filtros atuais.</div>}
      {achievementLimit<achievements.length&&<Button className="outline-button achievement-more" onClick={()=>setAchievementLimit(value=>Math.min(achievements.length,value+60))}>Mostrar mais 60</Button>}
    </section>
  </main>;
}
