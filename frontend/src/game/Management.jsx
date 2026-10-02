import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Plus, ArrowUpRight, CarFront, MapPin, ShieldCheck, Users, Wrench, Target, Power, Clock3, Navigation, Pencil, Route, UserMinus, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { SERVICE, ServiceIcon, money, STATUS, duration } from './common';
import { vehicleImage, VehicleThumbnail } from './vehicleMedia';
import { fetchRoadRoute } from './localGame';
import PERSONNEL_ATLAS_0 from './personnelAtlasPart0';
import PERSONNEL_ATLAS_1 from './personnelAtlasPart1';

const PersonnelAvatar = ({ person }) => { const index=Number.isInteger(person?.avatar_index)?person.avatar_index:0; const atlas=index<50?PERSONNEL_ATLAS_0:PERSONNEL_ATLAS_1; const local=index%50,col=local%10,row=Math.floor(local/10); return <span className="personnel-avatar" style={{backgroundImage:`url(${atlas})`,backgroundPosition:`${col*100/9}% ${row*100/4}%`}} aria-hidden="true" />; };

const VehicleArt = ({ service, vehicleType, name }) => {
  const [failed, setFailed] = useState(false);
  const label = name || (service === 'fire' ? 'Viatura dos bombeiros' : service === 'medical' ? 'Viatura médica' : 'Viatura da polícia');
  return <div className={`vehicle-art vehicle-photo ${service}`} role="img" aria-label={`${label}, imagem completa`}>
    {!failed ? <img src={vehicleImage(vehicleType)} alt="" loading="lazy" decoding="async" draggable="false" onError={() => setFailed(true)} /> : <ServiceIcon service={service} size={56} color={SERVICE[service].color} />}
  </div>;
};

const installed = (base, id) => (base.extensions || []).find(extension => extension.id === id);
const upgradeCost = base => Math.round(1800 * Math.pow(base.level || 1, 1.35));

export default function Management({ game, world, act, busy, mode }) {
  const [buildOpen, setBuildOpen] = useState(false);
  const [service, setService] = useState('fire');
  const [site, setSite] = useState(world.sites[0]?.id || '');
  const [commandCenterId, setCommandCenterId] = useState(game.active_command_center_id || game.command_centers?.[0]?.id || '');
  const [purchase, setPurchase] = useState(null);
  const [baseId, setBaseId] = useState('');
  const [filter, setFilter] = useState('all');
  const [unitOpenId, setUnitOpenId] = useState(null);
  const [unitNameDraft, setUnitNameDraft] = useState('');
  const [targetBaseId, setTargetBaseId] = useState('');
  const [transferEstimate, setTransferEstimate] = useState(null);
  const [transferBusy, setTransferBusy] = useState(false);
  const transferRequest = useRef(0);
  const fleet = mode === 'fleet';
  const buildPrice = game.progression?.next_building_costs?.[service] || world.services[service].base_price;
  const selectedVehicle = purchase && world.vehicle_catalog[purchase.service].find(vehicle => vehicle.id === purchase.vehicle_type);
  const assigned = base => game.units.filter(unit => unit.base_id === base.id).reduce((sum, unit) => sum + (unit.crew_assigned || 0), 0);
  const capacity = base => base.capacity || 2;
  const unitCount = base => game.units.filter(unit => unit.base_id === base.id).length;
  const availableBases = useMemo(() => {
    if (!purchase || !selectedVehicle) return [];
    return game.bases.filter(base => base.service === purchase.service && (base.level || 1) >= selectedVehicle.level && (!selectedVehicle.extension || installed(base, selectedVehicle.extension)?.active) && (!selectedVehicle.training || (base.qualifications?.[selectedVehicle.training] || 0) >= selectedVehicle.crew));
  }, [game.bases, purchase, selectedVehicle]);
  const selectedUnit = unitOpenId ? game.units.find(unit => unit.id === unitOpenId) : null;
  const selectedBase = selectedUnit ? game.bases.find(base => base.id === selectedUnit.base_id) : null;
  const selectedTransferBase = selectedUnit?.transfer_target_base_id ? game.bases.find(base => base.id === selectedUnit.transfer_target_base_id) : null;
  const selectedDefinition = selectedUnit ? world.vehicle_catalog[selectedUnit.service]?.find(vehicle => vehicle.id === selectedUnit.vehicle_type) : null;
  const requiredTraining = selectedDefinition?.training || selectedUnit?.training || null;
  const requiredTrainingName = requiredTraining ? world.training_catalog?.find(course => course.id === requiredTraining)?.name || requiredTraining : null;
  const selectedCrew = selectedUnit ? (selectedUnit.personnel_ids || []).map(id => (game.personnel || []).find(person => person.id === id)).filter(Boolean) : [];
  const freeBaseCrew = selectedUnit && selectedBase ? (game.personnel || []).filter(person => person.base_id === selectedBase.id && person.service === selectedUnit.service && !person.unit_id && person.status === 'available') : [];
  const crewLimit = selectedUnit ? Math.max(selectedUnit.crew_required || 1, selectedUnit.max_crew || selectedUnit.crew_required || 1) : 0;
  const canManageCrew = !!(selectedUnit && selectedBase && ['available', 'uncrewed'].includes(selectedUnit.status) && selectedUnit.node === selectedBase.node);
  const transferTargets = selectedUnit ? game.bases.filter(base => base.id !== selectedUnit.base_id && base.service === selectedUnit.service && base.land === selectedUnit.land) : [];
  const transferTarget = targetBaseId ? game.bases.find(base => base.id === targetBaseId) : null;
  const transferTargetCount = transferTarget ? game.units.filter(unit => unit.base_id === transferTarget.id || unit.transfer_target_base_id === transferTarget.id).length : 0;
  const unitAtBase = !!(selectedUnit && selectedBase && selectedUnit.status === 'available' && selectedUnit.node === selectedBase.node);

  useEffect(() => {
    if (unitOpenId && !game.units.some(unit => unit.id === unitOpenId)) setUnitOpenId(null);
  }, [unitOpenId, game.units]);

  const run = async (kind, data, success) => {
    const next = await act(kind, data);
    if (next && success) toast.success(success);
    return next;
  };
  const openUnit = unit => {
    transferRequest.current += 1;
    setUnitOpenId(unit.id);
    setUnitNameDraft(unit.callsign || unit.name);
    setTargetBaseId('');
    setTransferEstimate(null);
    setTransferBusy(false);
  };
  const estimateTransfer = async baseId => {
    const unit = game.units.find(item => item.id === unitOpenId);
    const target = game.bases.find(base => base.id === baseId);
    const request = ++transferRequest.current;
    setTargetBaseId(baseId);
    setTransferEstimate(null);
    if (!unit || !target) { setTransferBusy(false); return; }
    setTransferBusy(true);
    try {
      const route = await fetchRoadRoute({ lng: unit.lng, lat: unit.lat }, target.node, game.conditions);
      if (request === transferRequest.current) setTransferEstimate({ base_id: baseId, route });
    } catch (error) {
      if (request === transferRequest.current) setTransferEstimate({ base_id: baseId, error: error?.message || 'Não foi possível calcular o percurso.' });
    } finally {
      if (request === transferRequest.current) setTransferBusy(false);
    }
  };
  const startTransfer = async () => {
    if (!selectedUnit || !transferTarget || !transferEstimate?.route || transferEstimate.base_id !== transferTarget.id) return;
    const next = await run('transfer_unit', { unit_id: selectedUnit.id, base_id: transferTarget.id, route: transferEstimate.route }, 'Transferência rodoviária iniciada.');
    if (next) { setTargetBaseId(''); setTransferEstimate(null); }
  };
  const saveUnitName = async () => {
    if (!selectedUnit) return;
    const name = unitNameDraft.trim().slice(0, 24) || selectedUnit.name;
    if (await run('update_advanced_unit', { unit_id: selectedUnit.id, callsign: name }, 'Nome da viatura atualizado.')) setUnitNameDraft(name);
  };
  const assignPerson = personId => selectedUnit && run('assign_unit_personnel', { unit_id: selectedUnit.id, person_id: personId }, 'Elemento atribuído à viatura.');
  const removePerson = personId => selectedUnit && run('remove_unit_personnel', { unit_id: selectedUnit.id, person_id: personId }, 'Elemento removido da viatura.');
  const openPurchase = (serviceId, vehicle) => {
    setPurchase({ service: serviceId, vehicle_type: vehicle.id });
    setBaseId(game.bases.find(base => base.service === serviceId)?.id || '');
  };
  const buy = async () => {
    if (await run('buy_vehicle', { base_id: baseId, vehicle_type: purchase.vehicle_type }, 'Viatura adquirida e afeta à base.')) setPurchase(null);
  };
  const build = async () => {
    if (await run('build_base', { service, site_id: site, command_center_id:commandCenterId }, 'Nova base operacional.')) setBuildOpen(false);
  };

  return <main className="management-page">
    <div className="page-heading">
      <div><span className="page-eyebrow">RECURSOS OPERACIONAIS</span><h1 data-testid="management-title">{fleet ? 'Frota de emergência' : 'Rede de bases'}</h1><p>{fleet ? `${game.units.length} viaturas · ${game.units.filter(unit => unit.status === 'available').length} disponíveis` : `${game.bases.length} bases · ${game.progression?.unlocked_missions?.length || 0}/${world.mission_definitions.length} ocorrências desbloqueadas`}</p></div>
      {!fleet && <Button data-testid="build-base-open" className="primary-button" onClick={() => setBuildOpen(true)}><Plus size={16} /> Construir base</Button>}
    </div>

    {!fleet ? <>
      <div className="progression-ribbon">
        <div><Target size={18} /><span>Limite operacional</span><strong>{game.progression?.mission_cap || 3} ocorrências</strong></div>
        <div><ShieldCheck size={18} /><span>Modelos desbloqueados</span><strong>{game.progression?.unlocked_missions?.length || 0} de {world.mission_definitions.length}</strong></div>
        <div><Users size={18} /><span>Pessoal na rede</span><strong>{game.bases.reduce((sum, base) => sum + (base.personnel || 0), 0)} elementos</strong></div><div><ShieldCheck size={18} /><span>Financiamento público</span><strong>{money(game.public_funding||0)}</strong></div>
      </div>
      <div className="section-line"><h2>Infraestrutura ativa</h2><span>DESENVOLVIMENTO DA REDE</span></div>
      <div className="base-grid">{game.bases.map((base, index) => {
        const count = unitCount(base);
        const staffUsed = assigned(base);
        const specializations = world.specializations[base.service] || [];
        return <article className="base-card developed-base" key={base.id} data-testid={`base-card-${index}`} style={{ '--service-color': SERVICE[base.service].color }}>
          <div className="base-illustration"><div className="base-skyline"><span /><span /><span /><span /><span /></div><Building2 size={62} strokeWidth={1} /><div className="base-service-label"><ServiceIcon service={base.service} size={13} />{SERVICE[base.service].short}</div></div>
          <div className="base-info">
            <span className="operational-tag"><i /> {base.operational_at > game.elapsed ? `EM CONSTRUÇÃO · ${Math.ceil((base.operational_at-game.elapsed)/60)} MIN` : `OPERACIONAL · NÍVEL ${base.level || 1}`}</span>
            <h3>{base.name}</h3><p><MapPin size={13} />{base.city || game.city}</p>
            <div className="base-capacity"><span>Garagem</span><strong>{count}/{capacity(base)}</strong></div>
            <div className="capacity-track">{Array.from({ length: capacity(base) }, (_, slot) => <i key={slot} className={slot < count ? 'filled' : ''} />)}</div>
            <div className="staff-line"><Users size={14} /><span>Pessoal afeto</span><strong>{staffUsed}/{base.personnel || 0}</strong><small>cap. {base.staff_capacity || 14}</small></div>
            <div className="base-actions">
              <button data-testid={`base-buy-vehicle-${index}`} disabled={base.operational_at > game.elapsed || count >= capacity(base)} onClick={() => openPurchase(base.service, world.vehicle_catalog[base.service][0])}>Adquirir viatura <ArrowUpRight size={15} /></button>
              <button disabled={busy || base.operational_at > game.elapsed || (base.level || 1) >= 10} onClick={() => run('upgrade_base', { base_id: base.id }, `${base.name} melhorada.`)}><Wrench size={14} /> Melhorar · {money(upgradeCost(base))}</button>
              <button disabled={busy || (base.personnel || 0) + 2 > (base.staff_capacity || 14)} onClick={() => run('queue_recruitment', { base_id: base.id, amount: 2 }, 'Recrutamento de dois elementos iniciado.')}><Users size={14} /> Recrutar 2 · {money(450)}</button>
              <button className={base.mission_generation_enabled!==false?'active':''} onClick={()=>run('toggle_building_generation',{building_id:base.id,enabled:base.mission_generation_enabled===false},base.mission_generation_enabled===false?'Base reativada.':'Geração de ocorrências suspensa.')}><Power size={12}/>{base.mission_generation_enabled===false?'Reativar base':'Suspender geração'}</button>
            </div>
            <div className="base-development">
              <label>Especialização · reorganização 2 min<select value={base.specialization || 'general'} onChange={event => run('set_specialization', { base_id: base.id, specialization: event.target.value }, 'Especialização atualizada.')}>{specializations.map(option => <option key={option.id} value={option.id} disabled={option.extension && !installed(base, option.extension)?.active}>{option.name}</option>)}</select></label>
              <span className="development-label">Extensões</span>
              <div className="extension-list">{(world.extensions[base.service] || []).map(extension => {
                const state = installed(base, extension.id);
                const locked = (base.level || 1) < extension.level;
                return <button key={extension.id} className={state?.active ? 'active' : state ? 'installed' : ''} disabled={busy || locked || !!state?.completes_at} onClick={() => run('toggle_extension', { base_id: base.id, extension_id: extension.id }, state ? null : `${extension.name}: obras iniciadas.`)}>
                  <Power size={12} /> <span>{extension.name}<small>{locked ? `Nível ${extension.level}` : state?.completes_at ? `Obras · ${Math.ceil((state.completes_at-game.elapsed)/60)} min` : state ? (state.active ? 'Ativa' : 'Inativa') : money(Math.round(extension.cost*.8))}</small></span>
                </button>;
              })}</div>
            </div>
          </div>
        </article>;
      })}</div>
      <div className="expansion-strip"><Building2 size={28} /><div><h3>A rede determina as ocorrências.</h3><p>A expansão melhora cobertura e desbloqueia capacidade especializada. A pressão de ocorrências cresce sobretudo com território e progressão, não com o número bruto de bases.</p></div><Button className="outline-button" data-testid="expand-network-button" onClick={() => setBuildOpen(true)}>Expandir rede <Plus size={16} /></Button></div>
    </> : <>
      <div className="section-line"><h2>As tuas viaturas <span>{game.units.length}</span></h2><select aria-label="Filtrar frota" data-testid="fleet-filter" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Todos os serviços</option>{Object.entries(SERVICE).map(([key, info]) => <option key={key} value={key}>{info.name}</option>)}</select></div>
      <div className="fleet-grid">{game.units.filter(unit => filter === 'all' || filter === unit.service).map(unit => {
        const base = game.bases.find(item => item.id === unit.base_id);
        const transferBase = unit.transfer_target_base_id ? game.bases.find(item => item.id === unit.transfer_target_base_id) : null;
        return <article className="fleet-card" key={unit.id} role="button" tabIndex={0} aria-label={`Abrir gestão de ${unit.callsign || unit.name}`} data-testid={`fleet-unit-${unit.name}`} style={{ '--service-color': SERVICE[unit.service].color }} onClick={() => openUnit(unit)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openUnit(unit); } }}>
          <header><VehicleThumbnail unit={unit} className="fleet-card-thumbnail" /><div><small>{SERVICE[unit.service].short}</small><strong>{unit.callsign || unit.name}</strong></div></header>
          <div className="fleet-card-base"><MapPin size={13} /><span><small>{unit.status === 'base_transfer' ? 'TRANSFERÊNCIA' : 'BASE OPERACIONAL'}</small><b>{unit.status === 'base_transfer' ? `${base?.name || 'Origem'} → ${transferBase?.name || 'Destino'}` : base?.name || 'Base por definir'}</b></span></div>
          <div className="fleet-card-details"><span className={`fleet-status ${unit.status}`}><i />{STATUS[unit.status] || (unit.status === 'uncrewed' ? 'Sem equipa' : unit.status)}</span><span><small>CONDIÇÃO</small><b>{Math.round(unit.condition || 100)}%</b></span><span><small>EQUIPA</small><b>{unit.crew_assigned || 0}/{unit.crew_required || 0}</b></span><span><small>{unit.status === 'base_transfer' ? 'CHEGADA' : 'FADIGA'}</small><b>{unit.status === 'base_transfer' ? duration(Math.max(0, (unit.travel_total || 0) - (unit.travel || 0))) : `${Math.round(unit.fatigue || 0)}%`}</b></span></div>
        </article>;
      })}</div>
      <div className="section-line"><h2>Catálogo de viaturas</h2><span>EXPANDIR A FROTA</span></div>
      <div className="vehicle-grid expanded-catalog">{Object.entries(world.vehicle_catalog).flatMap(([serviceId, vehicles]) => vehicles.map((vehicle, vehicleIndex) => {
        const extensionName = vehicle.extension && (world.extensions[serviceId] || []).find(extension => extension.id === vehicle.extension)?.name;
        const eligible = game.bases.some(base => base.service === serviceId && (base.level || 1) >= vehicle.level && (!vehicle.extension || installed(base, vehicle.extension)?.active) && (!vehicle.training || (base.qualifications?.[vehicle.training] || 0) >= vehicle.crew));
        return <article key={vehicle.id} className="vehicle-card" data-testid={vehicleIndex === 0 ? `vehicle-shop-${serviceId}` : `vehicle-shop-${vehicle.id}`} style={{ '--service-color': SERVICE[serviceId].color }}>
          <div className="vehicle-category"><ServiceIcon service={serviceId} size={17} />{SERVICE[serviceId].short}<span>{vehicle.level > 1 ? 'ESPECIALIZADA' : 'CONVENCIONAL'}</span></div>
          <VehicleArt service={serviceId} vehicleType={vehicle.id} name={vehicle.name} /><h3>{vehicle.name}</h3>
          <p>{vehicle.crew} elementos · Base nível {vehicle.level}{extensionName ? ` · ${extensionName}` : ''}{vehicle.training ? ' · Formação obrigatória' : ''}</p>
          <div className="vehicle-price"><strong>{money(vehicle.price)}</strong><Button className="outline-button" data-testid={vehicleIndex === 0 ? `buy-vehicle-${serviceId}` : `buy-special-${serviceId}-${vehicle.id}`} onClick={() => openPurchase(serviceId, vehicle)} disabled={!eligible}><Plus size={15} /> {eligible ? 'Adquirir' : 'Bloqueado'}</Button></div>
        </article>;
      }))}</div>
    </>}

    <Dialog open={buildOpen} onOpenChange={setBuildOpen}><DialogContent className="game-modal" data-testid="build-base-modal"><div className="modal-eyebrow"><Building2 size={15} /> EXPANSÃO DA REDE</div><DialogTitle>Construir uma base</DialogTitle><DialogDescription>O preço cresce de forma moderada com a rede. A reserva operacional é protegida e o investimento elegível recebe cofinanciamento automático.</DialogDescription><label className="field-label">Centro de Comando<select value={commandCenterId} onChange={event=>setCommandCenterId(event.target.value)}>{(game.command_centers||[]).filter(center=>center.active!==false).map(center=><option value={center.id} key={center.id}>{center.name}</option>)}</select></label><label className="field-label">Serviço<select data-testid="base-service-select" value={service} onChange={event => setService(event.target.value)}>{Object.entries(SERVICE).map(([key, info]) => <option key={key} value={key}>{info.name}</option>)}</select></label><label className="field-label">Localização<select data-testid="base-site-select" value={site} onChange={event => setSite(event.target.value)}>{world.sites.map(option => <option key={option.id} value={option.id} disabled={option.unlock_level > game.level || game.bases.some(base => base.node === option.node && base.service === service)}>{option.name}{option.unlock_level > game.level ? ` · Nível ${option.unlock_level}` : game.bases.some(base => base.node === option.node && base.service === service) ? ' · Ocupado' : ''}</option>)}</select></label><div className="purchase-total"><span>Investimento progressivo</span><strong data-testid="base-price">{money(buildPrice)}</strong></div><Button data-testid="buy-station-button" className="primary-button" disabled={busy || !commandCenterId || game.bases.some(base => base.node === world.sites.find(option => option.id === site)?.node && base.service === service)} onClick={build}><Building2 size={16} />Confirmar construção · cofinanciamento automático</Button></DialogContent></Dialog>
    <Dialog open={!!selectedUnit} onOpenChange={open => { if (!open) { transferRequest.current += 1; setUnitOpenId(null); setTargetBaseId(''); setTransferEstimate(null); setTransferBusy(false); } }}>
      <DialogContent className="game-modal vehicle-command-modal" data-testid="fleet-unit-modal">
        {selectedUnit && <>
          <div className="modal-eyebrow"><CarFront size={15} /> GESTÃO DA VIATURA</div>
          <DialogTitle>{selectedUnit.callsign || selectedUnit.name}</DialogTitle>
          <DialogDescription>{SERVICE[selectedUnit.service].name} · {selectedDefinition?.name || selectedUnit.vehicle_type} · ID {selectedUnit.name}</DialogDescription>
          <div className="vehicle-command-hero" style={{ '--service-color': SERVICE[selectedUnit.service].color }}>
            <VehicleThumbnail unit={selectedUnit} className="vehicle-command-thumbnail" />
            <div><span className={`fleet-status ${selectedUnit.status}`}><i />{STATUS[selectedUnit.status] || selectedUnit.status}</span><strong>{selectedBase?.name || 'Base por definir'}</strong><small>{Math.round(selectedUnit.condition || 100)}% condição · {Math.round(selectedUnit.fatigue || 0)}% fadiga · {selectedUnit.crew_assigned || 0}/{selectedUnit.crew_required || 0} elementos</small></div>
          </div>

          <section className="vehicle-command-section">
            <header><Pencil size={15} /><div><h3>Nome da viatura</h3><p>Altera o nome operacional sem mudar o identificador interno.</p></div></header>
            <div className="vehicle-name-row"><input aria-label="Nome da viatura" maxLength={24} value={unitNameDraft} onChange={event => setUnitNameDraft(event.target.value)} /><Button className="outline-button" disabled={busy || !unitNameDraft.trim() || unitNameDraft.trim() === (selectedUnit.callsign || selectedUnit.name)} onClick={saveUnitName}><Pencil size={13} /> Guardar</Button></div>
          </section>

          <section className="vehicle-command-section">
            <header><Route size={15} /><div><h3>Transferir para outra base</h3><p>Calcula a rota rodoviária, distância, combustível e tempo antes de autorizar a saída.</p></div></header>
            {selectedUnit.status === 'base_transfer' ? <div className="transfer-live">
              <Navigation size={18} /><div><strong>A caminho de {selectedTransferBase?.name || 'nova base'}</strong><span>{duration(Math.max(0, (selectedUnit.travel_total || 0) - (selectedUnit.travel || 0)))} restantes · {((selectedUnit.route_distance || 0) / 1000).toFixed(1)} km</span></div>
              <div className="transfer-progress"><i style={{ width: `${selectedUnit.travel_total ? Math.min(100, Math.max(0, selectedUnit.travel / selectedUnit.travel_total * 100)) : 0}%` }} /></div>
            </div> : <>
              <label className="field-label">Base de destino<select value={targetBaseId} disabled={!unitAtBase || busy} onChange={event => estimateTransfer(event.target.value)}>
                <option value="">Escolher base...</option>
                {transferTargets.map(base => {
                  const count = game.units.filter(unit => unit.base_id === base.id || unit.transfer_target_base_id === base.id).length;
                  const unavailable = base.enabled === false || base.operational_at > game.elapsed || count >= (base.capacity || 2);
                  return <option key={base.id} value={base.id} disabled={unavailable}>{base.name} · garagem {count}/{base.capacity || 2}{unavailable ? ' · indisponível' : ''}</option>;
                })}
              </select></label>
              {!unitAtBase && <p className="vehicle-command-warning">A viatura tem de estar disponível e fisicamente na base antes de poder ser transferida.</p>}
              {transferBusy && <div className="transfer-estimate loading"><Clock3 size={15} /> A calcular percurso rodoviário...</div>}
              {transferEstimate?.error && <div className="transfer-estimate error">{transferEstimate.error}</div>}
              {transferEstimate?.route && transferEstimate.base_id === targetBaseId && <div className="transfer-estimate"><div><Navigation size={15} /><span><small>DISTÂNCIA</small><strong>{(transferEstimate.route.distance / 1000).toFixed(1)} km</strong></span></div><div><Clock3 size={15} /><span><small>TEMPO</small><strong>{duration(transferEstimate.route.duration)}</strong></span></div><div><span><small>COMBUSTÍVEL EST.</small><strong>{Math.max(.2, transferEstimate.route.distance / 1000 * .42).toFixed(1)}</strong></span></div></div>}
              <label className="vehicle-fixed-crew"><input type="checkbox" checked={selectedUnit.fixed_crew === true} disabled={busy} onChange={event => run('update_advanced_unit', { unit_id: selectedUnit.id, fixed_crew: event.target.checked }, event.target.checked ? 'A tripulação acompanhará futuras transferências.' : 'A tripulação será substituída na base de destino.')} /><span><b>Levar a tripulação atual</b><small>Se desligado, a equipa atual fica na origem e a base de destino atribui uma nova equipa disponível.</small></span></label>
              <Button className="primary-button transfer-start-button" disabled={busy || transferBusy || !unitAtBase || !transferTarget || transferTargetCount >= (transferTarget?.capacity || 2) || !transferEstimate?.route || transferEstimate.base_id !== targetBaseId} onClick={startTransfer}><Navigation size={15} /> Iniciar transferência</Button>
            </>}
          </section>

          <section className="vehicle-command-section">
            <header><Users size={15} /><div><h3>Tripulação</h3><p>{selectedCrew.length}/{crewLimit} lugares ocupados{requiredTrainingName ? ` · requer ${requiredTrainingName}` : ''}.</p></div></header>
            {!canManageCrew && selectedUnit.status !== 'base_transfer' && <p className="vehicle-command-warning">A gestão da equipa só está disponível com a viatura parada na sua base.</p>}
            <div className="crew-columns">
              <div><h4>ATRIBUÍDOS</h4><div className="crew-list">{selectedCrew.length ? selectedCrew.map(person => <div className="crew-row" key={person.id}><PersonnelAvatar person={person} /><span><b>{person.name}</b><small>{person.rank || 'Operacional'} · fadiga {Math.round(person.fatigue || 0)}%</small></span><button aria-label={`Remover ${person.name}`} disabled={busy || !canManageCrew} onClick={() => removePerson(person.id)}><UserMinus size={14} /> Remover</button></div>) : <p className="crew-empty">Sem elementos atribuídos.</p>}</div></div>
              <div><h4>DISPONÍVEIS NA BASE</h4><div className="crew-list">{freeBaseCrew.length ? freeBaseCrew.map(person => {
                const qualified = !requiredTraining || (person.qualifications || []).includes(requiredTraining);
                return <div className="crew-row" key={person.id}><PersonnelAvatar person={person} /><span><b>{person.name}</b><small>{person.rank || 'Operacional'}{qualified ? ' · disponível' : ` · falta ${requiredTrainingName}`}</small></span><button aria-label={`Atribuir ${person.name}`} disabled={busy || !canManageCrew || selectedCrew.length >= crewLimit || !qualified} onClick={() => assignPerson(person.id)}><UserPlus size={14} /> Atribuir</button></div>;
              }) : <p className="crew-empty">Não há elementos livres nesta base.</p>}</div></div>
            </div>
          </section>
        </>}
      </DialogContent>
    </Dialog>
    <Dialog open={!!purchase} onOpenChange={open => !open && setPurchase(null)}><DialogContent className="game-modal" data-testid="buy-vehicle-modal"><div className="modal-eyebrow"><CarFront size={15} /> NOVA VIATURA</div><DialogTitle>Reforçar a frota</DialogTitle><DialogDescription>{selectedVehicle?.name} · {selectedVehicle?.crew} elementos</DialogDescription>{purchase && selectedVehicle && <><VehicleArt service={purchase.service} vehicleType={selectedVehicle.id} name={selectedVehicle.name} /><label className="field-label">Base de afetação<select data-testid="vehicle-base-select" value={baseId} onChange={event => setBaseId(event.target.value)}>{availableBases.map(base => <option key={base.id} value={base.id}>{base.name} ({unitCount(base)}/{capacity(base)} viaturas · {(base.personnel || 0) - assigned(base)} disponíveis)</option>)}</select></label><div className="purchase-total"><span>Viatura</span><strong data-testid="vehicle-purchase-price">{money(selectedVehicle.price)}</strong></div><Button data-testid="buy-vehicle-button" className="primary-button" disabled={busy || !baseId} onClick={buy}><Plus size={16} />Confirmar aquisição</Button></>}</DialogContent></Dialog>
  </main>;
}
