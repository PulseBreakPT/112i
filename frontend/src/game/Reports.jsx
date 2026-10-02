import { Activity, CheckCheck, CircleX, Download, Radio, ShieldCheck, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { SERVICE, ServiceIcon, money } from './common';
import { REPORT_FILENAME } from './branding';
import { portugalDateTime, portugalTime, recordRealTime } from './engines/timeEngine';

export default function Reports({ game }) {
  const closed=game.history||[];
  const successRate=closed.length?Math.round(closed.filter(item=>item.success).length/closed.length*100):0;
  const metrics=[[CheckCheck,'Ocorrências resolvidas',game.completed,'completed'],[TrendingUp,'Receitas operacionais',money(game.earned),'earnings'],[ShieldCheck,'Confiança pública',game.trust+'%','trust'],[Activity,'Taxa de sucesso',successRate+'%','success'],[TrendingUp,'Venda de património',money(game.asset_sales||0),'asset-sales']];
  const download=()=>{const blob=new Blob([JSON.stringify({city:game.city,territory:'Portugal',mode:game.mode,completed:game.completed,budget:game.money,trust:game.trust,earned:game.earned,asset_sales:game.asset_sales||0,history:game.history,logs:game.logs},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=REPORT_FILENAME;link.click();URL.revokeObjectURL(url);};
  return <main className="management-page">
    <div className="page-heading"><div><span className="page-eyebrow">DESEMPENHO OPERACIONAL</span><h1 data-testid="reports-title">Relatórios</h1><p>Portugal · Central do {game.city} · {portugalDateTime(new Date())}</p></div><div><span className="report-live"><span className="live-dot"/> TURNO EM CURSO</span><Button className="outline-button" data-testid="export-report" onClick={download}><Download size={14}/> Exportar relatório</Button></div></div>
    <div className="report-metrics">{metrics.map(([Icon,label,value,key])=><div className="report-metric" key={key} data-metric={key} data-tone={key==='trust'?(game.trust>=80?'positive':game.trust>=50?'warning':'negative'):undefined}><Icon size={20}/><span>{label}</span><strong data-testid={'report-'+key}>{value}</strong></div>)}</div>
    <section><div className="section-line"><h2>Histórico de ocorrências</h2><span>{closed.length} REGISTOS</span></div>{!closed.length?<div className="report-empty" data-testid="history-empty"><Radio size={35}/><h3>Sem ocorrências encerradas</h3><p>Consulta aqui o resultado de cada intervenção após o encerramento.</p></div>:<div className="history-list">{closed.map(h=><div key={h.id} className="history-row" data-testid={'history-'+h.id}><span className="history-icon" style={{color:SERVICE[h.service].ink}}><ServiceIcon service={h.service}/></span><div><strong>{h.title}</strong><small>{portugalTime(recordRealTime(h,game))} · <span className={'history-result '+(h.success?'positive':'negative')}>{h.success?<CheckCheck size={11}/>:<CircleX size={11}/>} {h.success?'Resolvida com sucesso':'Prazo excedido'}</span></small></div><b className={h.success?'positive':'negative'}>{h.success?'+'+money(h.reward):'Não resolvida'}</b></div>)}</div>}</section>
    <div className="section-line"><h2>Registo de operações</h2><span>ÚLTIMAS TRANSMISSÕES</span></div>
    <div className="full-logs">{game.logs.slice(0,15).map(l=><div key={l.id} data-testid={'log-entry-'+l.id}><time>{portugalTime(recordRealTime(l,game))}</time><span className={'log-dot '+l.kind}/><span>{l.text}</span></div>)}</div>
  </main>;
}
