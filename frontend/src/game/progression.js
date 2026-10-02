import { NEW_VEHICLES, NEW_MISSION_DEFINITIONS } from './expansionContent';

export const EXTENSIONS = {
  fire: [
    { id: 'aerial', name: 'Meios aéreos e altura', cost: 7000, level: 2 },
    { id: 'wildfire', name: 'Combate florestal', cost: 6000, level: 2 },
    { id: 'hazmat', name: 'Matérias perigosas', cost: 9500, level: 3 },
    { id: 'water', name: 'Salvamento aquático', cost: 8500, level: 3 },
  ],
  medical: [
    { id: 'advanced-care', name: 'Suporte avançado de vida', cost: 7500, level: 2 },
    { id: 'hospital-network', name: 'Rede hospitalar', cost: 9000, level: 3 },
    { id: 'mass-casualty', name: 'Catástrofe e triagem', cost: 11000, level: 4 },
  ],
  police: [
    { id: 'canine', name: 'Unidade cinotécnica', cost: 6000, level: 2 },
    { id: 'public-order', name: 'Ordem pública', cost: 8000, level: 2 },
    { id: 'explosives', name: 'Inativação de explosivos', cost: 10500, level: 3 },
  ],
};

export const SPECIALIZATIONS = {
  fire: [
    { id: 'general', name: 'Resposta geral' },
    { id: 'urban', name: 'Incêndios urbanos' },
    { id: 'wildfire', name: 'Incêndios florestais', extension: 'wildfire' },
    { id: 'industrial', name: 'Risco industrial', extension: 'hazmat' },
  ],
  medical: [
    { id: 'general', name: 'Emergência geral' },
    { id: 'trauma', name: 'Trauma' },
    { id: 'advanced-care', name: 'Suporte avançado', extension: 'advanced-care' },
  ],
  police: [
    { id: 'general', name: 'Patrulhamento' },
    { id: 'public-order', name: 'Ordem pública', extension: 'public-order' },
    { id: 'criminal', name: 'Investigação criminal' },
  ],
};

export const VEHICLE_CATALOG = {
  fire: [
    { id: 'fire-engine', name: 'VFCI', level: 1, price: 5000, crew: 5 },
    { id: 'ladder', name: 'Auto-Escada', level: 2, price: 8500, crew: 3, extension: 'aerial' },
    { id: 'wildfire-unit', name: 'VLCI', level: 2, price: 7000, crew: 5, extension: 'wildfire' },
    { id: 'hazmat-unit', name: 'Matérias Perigosas', level: 3, price: 11000, crew: 4, extension: 'hazmat', training: 'hazmat' },
    ...NEW_VEHICLES.fire,
  ],
  medical: [
    { id: 'ambulance', name: 'ABSC', level: 1, price: 4000, crew: 2 },
    { id: 'vmer', name: 'VMER', level: 2, price: 9000, crew: 2, extension: 'advanced-care', training: 'advanced-care' },
    { id: 'mass-casualty-unit', name: 'Posto Médico Avançado', level: 4, price: 14000, crew: 6, extension: 'mass-casualty', training: 'triage' },
    ...NEW_VEHICLES.medical,
  ],
  police: [
    { id: 'patrol', name: 'Carro-patrulha', level: 1, price: 3000, crew: 2 },
    { id: 'canine-unit', name: 'Unidade Cinotécnica', level: 2, price: 6500, crew: 2, extension: 'canine', training: 'canine' },
    { id: 'riot-unit', name: 'Ordem Pública', level: 2, price: 8500, crew: 6, extension: 'public-order', training: 'public-order' },
    ...NEW_VEHICLES.police,
  ],
};

export const POIS = [
  { id: 'poi-industrial-porto', type: 'industrial', name: 'Zona Industrial de Campanhã', node: 'porto-campanha', city: 'Porto' },
  { id: 'poi-school-porto', type: 'school', name: 'Campus da Asprela', node: 'porto-asprela', city: 'Porto' },
  { id: 'poi-retail-porto', type: 'retail', name: 'Baixa Comercial', node: 'porto-aliados', city: 'Porto' },
  { id: 'poi-forest-porto', type: 'forest', name: 'Parque da Cidade', node: 'porto-foz', city: 'Porto' },
  { id: 'poi-port-porto', type: 'port', name: 'Porto de Leixões', node: 'matosinhos', city: 'Porto' },
  { id: 'poi-industrial-braga', type: 'industrial', name: 'Zona Industrial de Braga', node: 'braga', city: 'Braga' },
  { id: 'poi-hospital-lisboa', type: 'hospital', name: 'Centro Hospitalar de Lisboa', node: 'lisboa', city: 'Lisboa' },
  { id: 'poi-airport-faro', type: 'airport', name: 'Aeroporto de Faro', node: 'faro', city: 'Faro' },
  { id: 'poi-port-funchal', type: 'port', name: 'Porto do Funchal', node: 'funchal', city: 'Funchal' },
];

export const MISSION_DEFINITIONS = [
  { scenario: 0, name: 'Incêndio num armazém', min: { fire: 1, medical: 1 }, poi: 'industrial', weight: 7 },
  { scenario: 1, name: 'Pessoa inconsciente', min: { medical: 1 }, weight: 12 },
  { scenario: 2, name: 'Assalto a estabelecimento', min: { police: 1 }, poi: 'retail', weight: 10 },
  { scenario: 3, name: 'Colisão rodoviária', min: { fire: 2, medical: 1, police: 1 }, weight: 5 },
  { scenario: 4, name: 'Incêndio em vegetação', min: { fire: 1 }, poi: 'forest', specialization: 'wildfire', weight: 9 },
  { scenario: 5, name: 'Distúrbios na praça', min: { police: 1 }, weight: 9 },
  { scenario: 6, name: 'Queda na via pública', min: { medical: 1 }, weight: 11 },
  { scenario: 7, name: 'Incêndio em edifício alto', min: { fire: 3, medical: 1 }, extension: ['aerial'], vehicle: ['ladder'], specialization: 'urban', weight: 4 },
  { scenario: 8, name: 'Derrame químico industrial', min: { fire: 4, medical: 2, police: 1 }, extension: ['hazmat'], vehicle: ['hazmat-unit'], poi: 'industrial', specialization: 'industrial', weight: 3 },
  { scenario: 9, name: 'Busca de pessoa desaparecida', min: { police: 3 }, extension: ['canine'], vehicle: ['canine-unit'], poi: 'forest', specialization: 'criminal', weight: 5 },
  { scenario: 10, name: 'Incidente com múltiplas vítimas', min: { medical: 4, fire: 2, police: 2 }, extension: ['mass-casualty'], vehicle: ['mass-casualty-unit'], weight: 2 },
  ...NEW_MISSION_DEFINITIONS,
];

export function basesForCommand(game, commandCenterId = null) {
  const operational = game.bases.filter(base => base.enabled!==false && (!base.operational_at || base.operational_at <= (game.elapsed || 0)));
  if (!commandCenterId) return operational;
  return operational.filter(base => base.command_center_id === commandCenterId);
}

export function unitsForCommand(game, commandCenterId = null) {
  const baseIds = new Set(basesForCommand(game, commandCenterId).map(base => base.id));
  return game.units.filter(unit => baseIds.has(unit.base_id));
}

export function buildingCounts(game, commandCenterId = null) {
  return basesForCommand(game, commandCenterId).reduce((out, base) => ({ ...out, [base.service]: (out[base.service] || 0) + 1 }), {});
}

export function missionCap(game, commandCenterId = null) {
  const areaBases = basesForCommand(game, commandCenterId);
  const coveredCities = new Set(areaBases.map(base => base.city)).size;
  const levelPressure = Math.floor(Math.max(0, (game.level || 1) - 1) / 3);
  const territoryPressure = Math.floor(Math.max(0, coveredCities - 1) / 2);
  // Capacity pressure is driven by territory and career progression, not by
  // repeatedly building the same service. Expansion should help the player
  // respond, not automatically punish them with one extra incident per base.
  return Math.max(3, Math.min(8, 3 + levelPressure + territoryPressure));
}

export function nextBuildingCost(game, service, basePrice) {
  const total = game.bases.length;
  if (total < 25) return Math.round(basePrice * (1 + total * 0.07));
  return Math.round(100000 + 200000 * Math.log2(Math.max(2, total - 22)));
}

export function activeExtensions(game, commandCenterId = null) {
  return new Set(basesForCommand(game, commandCenterId).flatMap(base => (base.extensions || []).filter(ext => ext.active).map(ext => ext.id)));
}

export function eligibleMissions(game, commandCenterId = null) {
  const areaBases = basesForCommand(game, commandCenterId);
  const counts = buildingCounts(game, commandCenterId);
  const coveredCities = new Set(areaBases.map(base => base.city));
  const pois = [...POIS, ...(game.player_pois || [])];
  return MISSION_DEFINITIONS.filter(def => {
    // A player must have a presence for every involved service, but is no longer
    // able to suppress an incident forever simply by refusing to buy the exact
    // specialist extension/vehicle that would make it easy.
    const servicePresence = Object.keys(def.min || {}).every(service => (counts[service] || 0) >= 1);
    const complexity = Object.values(def.min || {}).reduce((sum, count) => sum + count, 0);
    const specialist = (def.extension || []).length + (def.vehicle || []).length;
    const requiredLevel = Math.max(1, Math.min(6, Math.ceil(complexity / 2) + (specialist ? 1 : 0)));
    const hasPoi = !def.poi || pois.some(poi => poi.type === def.poi && (poi.command_center_id ? poi.command_center_id === commandCenterId : coveredCities.has(poi.city)));
    return servicePresence && (game.level || 1) >= requiredLevel && hasPoi;
  });
}

export function weightedMission(game, commandCenterId = null, random = Math.random) {
  const pool = eligibleMissions(game, commandCenterId);
  if (!pool.length) return MISSION_DEFINITIONS[1];
  // Specialising a base improves the response to matching incidents; it must
  // not make those incidents artificially more likely to occur.
  const weight = item => item.weight;
  const total = pool.reduce((sum, item) => sum + weight(item), 0);
  let roll = random() * total;
  return pool.find(item => (roll -= weight(item)) <= 0) || pool[pool.length - 1];
}

export function progressionSnapshot(game, services) {
  const centers = (game.command_centers || []).filter(center => center.active !== false);
  const byCommand = Object.fromEntries(centers.map(center => {
    const eligible = eligibleMissions(game, center.id);
    return [center.id, {
      mission_cap: missionCap(game, center.id),
      unlocked_missions: eligible.map(item => item.scenario),
      building_counts: buildingCounts(game, center.id),
    }];
  }));
  const eligible = centers.length
    ? MISSION_DEFINITIONS.filter(item => centers.some(center => byCommand[center.id].unlocked_missions.includes(item.scenario)))
    : eligibleMissions(game);
  const regionalCap = centers.length ? Object.values(byCommand).reduce((sum, area) => sum + area.mission_cap, 0) : missionCap(game);
  return {
    mission_cap: Math.max(regionalCap, game.incidents?.length || 0),
    unlocked_missions: eligible.map(item => item.scenario),
    next_building_costs: Object.fromEntries(Object.entries(services).map(([id, service]) => [id, nextBuildingCost(game, id, service.base_price)])),
    building_counts: buildingCounts(game),
    command_centers: byCommand,
  };
}

export function extensionsFor(service) {
  return EXTENSIONS[service] || [];
}

export function specializationsFor(service) {
  return SPECIALIZATIONS[service] || [];
}
