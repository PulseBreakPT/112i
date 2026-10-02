import { useMemo, useState } from 'react';
import { Building2, Crosshair, MapPin, Plus, Radar, RadioTower, Save, Trash2, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog';
import { SERVICE } from './common';
import './CommandCenters.css';

const POI_TYPES = [
  ['industrial','Zona industrial'],['school','Escola ou campus'],['retail','Centro comercial'],
  ['forest','Floresta ou parque'],['port','Porto'],['hospital','Hospital'],['airport','Aeroporto'],
  ['stadium','Estádio'],['tunnel','Túnel'],['refinery','Refinaria'],
];

export default function CommandCenters({ game, world, act, busy }) {
  const centers = useMemo(() => game.command_centers || [], [game.command_centers]);
  const [createOpen, setCreateOpen] = useState(false);
  const [poiOpen, setPoiOpen] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [centerDraft, setCenterDraft] = useState({ name:'Comando Regional', site_id:world.command_center_sites[0]?.id || '', radius_km:35 });
  const [poiDraft, setPoiDraft] = useState({ name:'', type:'industrial', site_id:world.command_center_sites[0]?.id || '', command_center_id:game.active_command_center_id || centers[0]?.id || '', custom:false, lng:'', lat:'', city:'' });
  const unassignedBases = game.bases.filter(base => !centers.some(center => center.id === base.command_center_id));
  const unassignedFacilities = (game.facilities || []).filter(facility => !centers.some(center => center.id === facility.command_center_id));
  const active = centers.find(center => center.id === game.active_command_center_id) || centers[0];
  const stats = useMemo(() => Object.fromEntries(centers.map(center => {
    const bases = game.bases.filter(base => base.command_center_id === center.id);
    const units = game.units.filter(unit => bases.some(base => base.id === unit.base_id));
    const incidents = game.incidents.filter(incident => incident.command_center_id === center.id);
    return [center.id,{bases,units,incidents,facilities:(game.facilities||[]).filter(item=>item.command_center_id===center.id),progression:game.progression?.command_centers?.[center.id]}];
  })), [centers, game]);

  const run = async (kind, data, message) => {
    const next = await act(kind, data);
    if (next && message) toast.success(message);
    return next;
  };
  const draftFor = center => drafts[center.id] || { name:center.name, radius_km:center.radius_km };
  const setDraft = (center, key, value) => setDrafts(current => ({...current,[center.id]:{...draftFor(center),[key]:value}}));
  const saveCenter = center => run('update_command_center',{command_center_id:center.id,...draftFor(center)},'Área operacional atualizada.');
  const createCenter = async () => { if(await run('create_command_center',centerDraft,'Centro de Comando criado.'))setCreateOpen(false); };
  const createPoi = async () => { if(await run('create_player_poi',poiDraft,'PDI adicionado à cobertura.')){setPoiOpen(false);setPoiDraft(current=>({...current,name:''}));} };

  return <main className="management-page command-page">
    <div className="page-heading command-heading"><div><span className="page-eyebrow">GESTÃO TERRITORIAL</span><h1>Comandos</h1><p>Gere centros de comando, cobertura territorial, atribuições e PDIs.</p></div><div className="command-heading-actions"><Button className="outline-button" onClick={() => setPoiOpen(true)}><MapPin size={15}/> Criar PDI</Button><Button className="primary-button" onClick={() => setCreateOpen(true)}><Plus size={15}/> Novo comando</Button></div></div>

    <section className="command-overview" aria-label="Resumo territorial">
      <div className="command-radar" aria-hidden="true"><i/><i/><i/><i/><Radar size={35}/></div>
      <div><span>COBERTURA ATIVA</span><strong>{active?.name || 'Sem comando ativo'}</strong><small>{active ? `${active.city} · raio ${active.radius_km} km` : 'Cria uma área para iniciar a cobertura regional.'}</small></div>
      <div className="command-overview-metrics"><span><b>{centers.length}</b> comandos</span><span><b>{unassignedBases.length + unassignedFacilities.length}</b> sem atribuição</span><span><b>{game.player_pois?.length || 0}</b> PDIs próprios</span></div>
    </section>

    <div className="section-line"><h2>Rede de comando</h2><span>RECURSOS ISOLADOS POR ÁREA</span></div>
    <div className="command-grid">{centers.map(center => {
      const data=stats[center.id],draft=draftFor(center),isActive=center.id===game.active_command_center_id;
      return <article key={center.id} className={`command-card ${isActive?'active':''}`}>
        <header><div className="command-emblem"><RadioTower size={22}/></div><div><span>{isActive?'VISTA ATIVA':'CENTRO DE COMANDO'}</span><h3>{center.name}</h3><p><MapPin size={12}/>{center.city} · {center.land==='mainland'?'Continente':'Região autónoma'}</p></div>{!isActive&&<button onClick={()=>run('set_active_command',{command_center_id:center.id})}>Abrir área</button>}</header>
        <div className="coverage-band"><div className="coverage-sweep"/><span><Crosshair size={14}/> RAIO</span><strong>{draft.radius_km} km</strong><input aria-label={`Raio de ${center.name}`} type="range" min="5" max="120" step="5" value={draft.radius_km} onChange={event=>setDraft(center,'radius_km',Number(event.target.value))}/></div>
        <div className="mission-range-grid">{[['fire','Bombeiros'],['medical','Emergência médica'],['police','Polícia']].map(([key,label])=><label key={key}>{label}<input type="number" min="2" max="200" defaultValue={center.mission_ranges?.[key]||center.radius_km} onBlur={event=>run('set_mission_range',{command_center_id:center.id,mission_key:key,radius_km:event.target.value},'Raio específico atualizado.')}/><span>km</span></label>)}</div>
        <div className="command-metrics"><span><Building2/><b>{data.bases.length}</b><small>bases</small></span><span><Warehouse/><b>{data.facilities.length}</b><small>instalações</small></span><span><RadioTower/><b>{data.units.length}</b><small>viaturas</small></span><span><Radar/><b>{data.progression?.unlocked_missions?.length||0}</b><small>cenários</small></span></div>
        <div className="command-edit"><input aria-label="Nome do Centro de Comando" value={draft.name} onChange={event=>setDraft(center,'name',event.target.value)}/><button disabled={busy} onClick={()=>saveCenter(center)}><Save size={13}/> Guardar</button></div>
        <div className="command-assignments"><strong>BASES ATRIBUÍDAS</strong>{game.bases.map(base=><label key={base.id} className={base.command_center_id===center.id?'owned':''}><span style={{'--service':SERVICE[base.service].ink}}/><em>{base.name}</em><select aria-label={`Comando de ${base.name}`} value={base.command_center_id||''} onChange={event=>run('assign_base_command',{base_id:base.id,command_center_id:event.target.value})}>{centers.map(option=><option value={option.id} key={option.id}>{option.name}</option>)}</select></label>)}</div><div className="command-assignments"><strong>INSTALAÇÕES ATRIBUÍDAS</strong>{(game.facilities||[]).map(facility=><label key={`facility-${facility.id}`} className={facility.command_center_id===center.id?'owned':''}><Warehouse size={14}/><em>{facility.name}</em><select aria-label={`Comando de ${facility.name}`} value={facility.command_center_id||''} onChange={event=>run('assign_facility_command',{facility_id:facility.id,command_center_id:event.target.value})}>{centers.map(option=><option value={option.id} key={option.id}>{option.name}</option>)}</select></label>)}</div>
      </article>;
    })}</div>

    <div className="section-line"><h2>PDIs do jogador</h2><span>INFLUENCIAM A GERAÇÃO REGIONAL</span></div>
    <div className="poi-board">{(game.player_pois||[]).map(poi=><article key={poi.id}><MapPin size={17}/><div><strong>{poi.name}</strong><small>{POI_TYPES.find(([id])=>id===poi.type)?.[1]||poi.type} · {poi.city} · {centers.find(center=>center.id===poi.command_center_id)?.name}</small></div><button data-action-tone="danger" aria-label={`Remover ${poi.name}`} onClick={()=>run('delete_player_poi',{poi_id:poi.id})}><Trash2 size={14}/></button></article>)}{!game.player_pois?.length&&<div className="operations-empty compact"><MapPin size={23}/><p>Sem PDIs próprios. Adiciona locais estratégicos para desbloquear ocorrências específicas nesta área.</p></div>}</div>

    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="game-modal"><div className="modal-eyebrow"><RadioTower size={15}/> NOVO COMANDO</div><DialogTitle>Criar Centro de Comando</DialogTitle><DialogDescription>A área passa a ter o seu próprio conjunto de recursos e ocorrências desbloqueadas.</DialogDescription><label className="field-label">Nome<input value={centerDraft.name} onChange={event=>setCenterDraft(current=>({...current,name:event.target.value}))}/></label><label className="field-label">Sede<select value={centerDraft.site_id} onChange={event=>setCenterDraft(current=>({...current,site_id:event.target.value}))}>{world.command_center_sites.map(site=><option key={site.id} value={site.id}>{site.name} · {site.city}</option>)}</select></label><label className="field-label">Raio operacional · {centerDraft.radius_km} km<input type="range" min="5" max="120" step="5" value={centerDraft.radius_km} onChange={event=>setCenterDraft(current=>({...current,radius_km:Number(event.target.value)}))}/></label><div className="purchase-total"><span>Investimento</span><strong>{centers.length?'5 000 € · cofinanciável':'Incluído'}</strong></div><Button data-action-tone="positive" className="primary-button" disabled={busy||!centerDraft.name.trim()} onClick={createCenter}><RadioTower size={15}/> Criar área operacional</Button></DialogContent></Dialog>

    <Dialog open={poiOpen} onOpenChange={setPoiOpen}><DialogContent className="game-modal"><div className="modal-eyebrow"><MapPin size={15}/> PONTO DE INTERESSE</div><DialogTitle>Adicionar PDI</DialogTitle><DialogDescription>Usa um local conhecido ou introduz qualquer coordenada real.</DialogDescription><label className="field-label">Nome<input value={poiDraft.name} onChange={event=>setPoiDraft(current=>({...current,name:event.target.value}))}/></label><label className="field-label">Tipo<select value={poiDraft.type} onChange={event=>setPoiDraft(current=>({...current,type:event.target.value}))}>{POI_TYPES.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label className="field-label poi-custom-toggle"><input type="checkbox" checked={poiDraft.custom} onChange={event=>setPoiDraft(current=>({...current,custom:event.target.checked}))}/> Coordenadas personalizadas</label>{poiDraft.custom?<div className="coordinate-grid"><label className="field-label">Longitude<input type="number" step="0.000001" placeholder="-7.9304" value={poiDraft.lng} onChange={event=>setPoiDraft(current=>({...current,lng:event.target.value}))}/></label><label className="field-label">Latitude<input type="number" step="0.000001" placeholder="37.0194" value={poiDraft.lat} onChange={event=>setPoiDraft(current=>({...current,lat:event.target.value}))}/></label><label className="field-label">Localidade<input value={poiDraft.city} onChange={event=>setPoiDraft(current=>({...current,city:event.target.value}))}/></label></div>:<label className="field-label">Localização<select value={poiDraft.site_id} onChange={event=>setPoiDraft(current=>({...current,site_id:event.target.value}))}>{world.command_center_sites.map(site=><option key={site.id} value={site.id}>{site.name} · {site.city}</option>)}</select></label>}<label className="field-label">Centro de Comando<select value={poiDraft.command_center_id} onChange={event=>setPoiDraft(current=>({...current,command_center_id:event.target.value}))}>{centers.map(center=><option key={center.id} value={center.id}>{center.name}</option>)}</select></label><Button className="primary-button" disabled={busy||!poiDraft.name.trim()||!poiDraft.command_center_id||(poiDraft.custom&&(!poiDraft.lng||!poiDraft.lat))} onClick={()=>createPoi()}><MapPin size={15}/> Adicionar à cobertura</Button></DialogContent></Dialog>
  </main>;
}
