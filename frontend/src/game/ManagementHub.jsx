import { Link } from 'react-router-dom';
import { Building2, CarFront, RadioTower, Users, HeartPulse } from 'lucide-react';

const AREAS = [
  { to:'/comando', icon:RadioTower, title:'Comandos', text:'Centros de comando, cobertura territorial, atribuições e PDIs.' },
  { to:'/bases', icon:Building2, title:'Bases', text:'Rede de bases, extensões, especializações e complexos operacionais.' },
  { to:'/frota', icon:CarFront, title:'Frota', text:'Viaturas, aquisição, tripulações, turnos, manutenção e logística.' },
  { to:'/funcionarios', icon:Users, title:'Funcionários', text:'Efetivo, recrutamento, formação, qualificações e distribuição.' },
  { to:'/infraestruturas', icon:HeartPulse, title:'Infraestruturas', text:'Hospitais, prisões, escolas e capacidade de apoio.' },
];

export default function ManagementHub({ game }) {
  return <main className="management-page strategy-page">
    <div className="page-heading"><div><span className="page-eyebrow">GESTÃO OPERACIONAL</span><h1>Gestão</h1><p>Administra a estrutura permanente da rede a partir de um único ponto.</p></div></div>
    <section className="strategy-hero">
      <div className="strategy-pulse"><i/><Building2 size={27}/></div>
      <div><span>REDE ATIVA</span><strong>{game.bases.length} bases · {game.units.length} viaturas</strong><small>{(game.personnel||[]).length} funcionários · {(game.facilities||[]).length} infraestruturas · {(game.command_centers||[]).length} comandos</small></div>
      <div className="strategy-score"><Users/><b>{(game.personnel||[]).filter(person=>!person.unit_id&&person.status==='available').length}</b><span>disponíveis</span></div>
    </section>
    <div className="strategy-columns">
      {AREAS.map(({to,icon:Icon,title,text})=><section className="strategy-panel" key={to}>
        <header><Icon/><div><h2>{title}</h2><p>{text}</p></div></header>
        <Link className="primary-button" to={to}>Abrir {title.toLowerCase()}</Link>
      </section>)}
    </div>
  </main>;
}
