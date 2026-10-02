import { useMemo, useState } from 'react';
import { Building2, Plus, ArrowUpRight, CarFront, MapPin, ShieldCheck, Users, Wrench, Target, Power } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { SERVICE, ServiceIcon, money, STATUS } from './common';
import { vehicleImage, VehicleThumbnail } from './vehicleMedia';

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

  const run = async (kind, data, success) => {
    const next = await act(kind, data);
    if (next && success) toast.success(success);
    return next;
  };
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
      <div className="fleet-table"><div className="fleet-row fleet-table-header"><span>VIATURA</span><span>BASE OPERACIONAL</span><span>ESTADO</span><span>EQUIPA</span></div>{game.units.filter(unit => filter === 'all' || filter === unit.service).map(unit => <div className="fleet-row" key={unit.id} data-testid={`fleet-unit-${unit.name}`}><span><VehicleThumbnail unit={unit} className="fleet-vehicle-thumbnail" /><strong>{unit.name}</strong></span><span>{game.bases.find(base => base.id === unit.base_id)?.name}</span><span className={`fleet-status ${unit.status}`}><i />{STATUS[unit.status] || (unit.status === 'uncrewed' ? 'Sem equipa' : unit.status)} · {Math.round(unit.condition || 100)}%</span><span>{unit.crew_assigned || 0}/{unit.crew_required || 0} · fadiga {Math.round(unit.fatigue || 0)}%</span></div>)}</div>
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
    <Dialog open={!!purchase} onOpenChange={open => !open && setPurchase(null)}><DialogContent className="game-modal" data-testid="buy-vehicle-modal"><div className="modal-eyebrow"><CarFront size={15} /> NOVA VIATURA</div><DialogTitle>Reforçar a frota</DialogTitle><DialogDescription>{selectedVehicle?.name} · {selectedVehicle?.crew} elementos</DialogDescription>{purchase && selectedVehicle && <><VehicleArt service={purchase.service} vehicleType={selectedVehicle.id} name={selectedVehicle.name} /><label className="field-label">Base de afetação<select data-testid="vehicle-base-select" value={baseId} onChange={event => setBaseId(event.target.value)}>{availableBases.map(base => <option key={base.id} value={base.id}>{base.name} ({unitCount(base)}/{capacity(base)} viaturas · {(base.personnel || 0) - assigned(base)} disponíveis)</option>)}</select></label><div className="purchase-total"><span>Viatura</span><strong data-testid="vehicle-purchase-price">{money(selectedVehicle.price)}</strong></div><Button data-testid="buy-vehicle-button" className="primary-button" disabled={busy || !baseId} onClick={buy}><Plus size={16} />Confirmar aquisição</Button></>}</DialogContent></Dialog>
  </main>;
}
