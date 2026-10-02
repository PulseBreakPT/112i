import { useState } from 'react';
import { Building2, GraduationCap, Hospital, Landmark, MessageSquare, Network, Plus, RadioTower, Shield, Siren, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { clock, money } from './common';
import { reserveFloor } from './engines/economyEngine';

const BUILDING_TYPES = [
  { id:'hospital', name:'Hospital partilhado', icon:Hospital },
  { id:'prison', name:'Celas partilhadas', icon:Shield },
  { id:'academy', name:'Escola partilhada', icon:GraduationCap },
];
const EVENT_TYPES = [
  { id:'storm', name:'Tempestade regional' },
  { id:'unrest', name:'Distúrbios coordenados' },
  { id:'mass', name:'Múltiplas vítimas' },
];

export default function Cooperation({ game, world, act, busy }) {
  const centers=game.command_centers||[],sites=world.command_center_sites||[],cooperation=game.cooperation||{};
  const [message,setMessage]=useState('');
  const [building,setBuilding]=useState({type:'hospital',name:'Hospital partilhado'});
  const [event,setEvent]=useState({type:'storm',command_center_id:game.active_command_center_id||centers[0]?.id||''});
  const [large,setLarge]=useState({title:'Missão coletiva de grande escala',site_id:sites[0]?.id||'',command_center_id:game.active_command_center_id||centers[0]?.id||''});
  const run=async(kind,data,success)=>{const next=await act(kind,data);if(next&&success)toast.success(success);return next;};
  const sendMessage=async()=>{if(await run('send_alliance_message',{text:message},'Mensagem enviada.'))setMessage('');};
  const funds=cooperation.funds||0;

  return <main className="management-page strategy-page cooperation-page">
    <div className="page-heading"><div><span className="page-eyebrow">REDE COOPERATIVA</span><h1>Aliança operacional</h1><p>Fundos, edifícios partilhados, eventos, chat e missões coletivas no modo local.</p></div></div>
    <section className="strategy-hero"><div className="strategy-pulse"><i/><Network size={27}/></div><div><span>{cooperation.name||'Rede Nacional 112'}</span><strong>Nível {cooperation.level||1} · {money(funds)} em fundos</strong><small>{cooperation.shared_missions||0} ocorrências partilhadas · {(cooperation.buildings||[]).length} edifícios coletivos · {(cooperation.events||[]).filter(item=>item.status==='active').length} eventos ativos</small></div><div className="strategy-score"><Trophy/><b>{cooperation.members?.length||1}</b><span>membros</span></div></section>

    <div className="strategy-columns">
      <section className="strategy-panel"><header><Landmark/><div><h2>Finanças da aliança</h2><p>Contribuições saem do orçamento da tua central e alimentam edifícios/eventos coletivos.</p></div></header><div className="cooperation-card"><div><strong>Fundos disponíveis</strong><small>{money(funds)} · contribuição total {money(cooperation.contribution||0)}</small></div><Button disabled={busy||(game.money||0)-500<reserveFloor(game)} onClick={()=>run('contribute_cooperation',{amount:500},'Contribuição registada.')}>Contribuir {money(500)}</Button></div><div className="strategy-list">{(cooperation.log||[]).slice(0,6).map(item=><article key={item.id}><div><strong>{item.text}</strong><small>{clock(item.time||0)}</small></div></article>)}</div></section>
      <section className="strategy-panel"><header><MessageSquare/><div><h2>Canal operacional</h2><p>Regista decisões rápidas e pedidos de apoio.</p></div></header><div className="strategy-form inline"><input aria-label="Mensagem de aliança" value={message} onChange={event=>setMessage(event.target.value)} placeholder="Escreve atualização curta..." /><Button disabled={busy||!message.trim()} onClick={sendMessage}><MessageSquare size={14}/> Enviar</Button></div><div className="strategy-list">{(cooperation.chat||[]).slice(0,8).map(item=><article key={item.id}><div><strong>{item.author}</strong><small>{clock(item.time||0)} · {item.text}</small></div></article>)}{!(cooperation.chat||[]).length&&<article><div><strong>Sem mensagens</strong><small>Usa o canal para simular coordenação entre operadores.</small></div></article>}</div></section>
    </div>

    <div className="strategy-columns">
      <section className="strategy-panel"><header><Building2/><div><h2>Edifícios coletivos</h2><p>Hospitais, celas e escolas partilhadas para sustentar operações maiores.</p></div></header><div className="strategy-form"><select value={building.type} onChange={event=>setBuilding({...building,type:event.target.value,name:BUILDING_TYPES.find(item=>item.id===event.target.value)?.name||building.name})}>{BUILDING_TYPES.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><input value={building.name} onChange={event=>setBuilding({...building,name:event.target.value})}/><Button disabled={busy||funds<6500} onClick={()=>run('build_alliance_facility',building,'Edifício coletivo criado.')}><Plus size={14}/> Construir</Button></div><div className="complex-grid">{(cooperation.buildings||[]).map(item=>{const Icon=BUILDING_TYPES.find(type=>type.id===item.type)?.icon||Building2;return <article key={item.id}><h3><Icon size={15}/> {item.name}</h3><small>Nível {item.level||1} · capacidade {item.capacity}</small><Button disabled={busy||funds<3500*(item.level||1)} onClick={()=>run('upgrade_alliance_facility',{building_id:item.id},'Instalação ampliada.')}>Ampliar · {money(3500*(item.level||1))}</Button></article>;})}</div></section>
      <section className="strategy-panel"><header><Siren/><div><h2>Eventos e missões coletivas</h2><p>Gera cadeias de ocorrências partilhadas e uma missão de grande escala.</p></div></header><div className="strategy-form"><select value={event.type} onChange={eventObject=>setEvent({...event,type:eventObject.target.value})}>{EVENT_TYPES.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={event.command_center_id} onChange={eventObject=>setEvent({...event,command_center_id:eventObject.target.value})}>{centers.map(center=><option key={center.id} value={center.id}>{center.name}</option>)}</select><Button disabled={busy||funds<2500} onClick={()=>run('start_alliance_event',event,'Evento cooperativo lançado.')}>Lançar evento</Button></div><div className="strategy-form"><input value={large.title} onChange={eventObject=>setLarge({...large,title:eventObject.target.value})}/><select value={large.site_id} onChange={eventObject=>setLarge({...large,site_id:eventObject.target.value})}>{sites.map(site=><option key={site.id} value={site.id}>{site.name}</option>)}</select><select value={large.command_center_id} onChange={eventObject=>setLarge({...large,command_center_id:eventObject.target.value})}>{centers.map(center=><option key={center.id} value={center.id}>{center.name}</option>)}</select><Button disabled={busy||funds<2200} onClick={()=>run('start_large_scale_mission',large,'Missão coletiva criada.')}>Criar missão</Button></div><div className="strategy-list">{(cooperation.events||[]).slice(0,5).map(item=><article key={item.id}><div><strong>{item.title}</strong><small>{item.status==='active'?'Ativo':'Encerrado'} · fim às {clock(item.ends_at||0)}</small></div></article>)}{(cooperation.large_scale_missions||[]).slice(0,5).map(item=><article key={item.id}><div><strong>{item.title}</strong><small>Missão coletiva · {item.status}</small></div></article>)}</div></section>
    </div>

    <section className="strategy-panel"><header><RadioTower/><div><h2>Regras aplicadas</h2><p>A aliança local já altera a operação: partilha ocorrências, aumenta margem de resposta, consome fundos e agenda ocorrências cooperativas.</p></div></header><div className="task-list"><article className="done"><div className="task-icon"><Network/></div><div><strong>Partilha de ocorrências</strong><small>Botão disponível na mobilização de cada ocorrência.</small></div></article><article className="done"><div className="task-icon"><Building2/></div><div><strong>Infraestrutura coletiva</strong><small>Fundos, edifícios, níveis e capacidade própria.</small></div></article><article className="done"><div className="task-icon"><Siren/></div><div><strong>Eventos de aliança</strong><small>Criam operações planeadas que entram no mapa.</small></div></article></div></section>
  </main>;
}
