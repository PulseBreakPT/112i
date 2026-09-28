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
  ],
  medical: [
    { id: 'ambulance', name: 'ABSC', level: 1, price: 4000, crew: 2 },
    { id: 'vmer', name: 'VMER', level: 2, price: 9000, crew: 2, extension: 'advanced-care', training: 'advanced-care' },
    { id: 'mass-casualty-unit', name: 'Posto Médico Avançado', level: 4, price: 14000, crew: 6, extension: 'mass-casualty', training: 'triage' },
  ],
  police: [
    { id: 'patrol', name: 'Carro-patrulha', level: 1, price: 3000, crew: 2 },
    { id: 'canine-unit', name: 'Unidade Cinotécnica', level: 2, price: 6500, crew: 2, extension: 'canine', training: 'canine' },
    { id: 'riot-unit', name: 'Ordem Pública', level: 2, price: 8500, crew: 6, extension: 'public-order', training: 'public-order' },
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
];

export function buildingCounts(game) {
  return game.bases.reduce((out, base) => ({ ...out, [base.service]: (out[base.service] || 0) + 1 }), {});
}

export function missionCap(game) {
  const counts = Object.values(buildingCounts(game));
  return Math.max(3, Math.max(1, ...(counts.length ? counts : [0])) + 1);
}

export function nextBuildingCost(game, service, basePrice) {
  const total = game.bases.length;
  if (total < 25) return Math.round(basePrice * (1 + total * 0.07));
  return Math.round(100000 + 200000 * Math.log2(Math.max(2, total - 22)));
}

export function activeExtensions(game) {
  return new Set(game.bases.flatMap(base => (base.extensions || []).filter(ext => ext.active).map(ext => ext.id)));
}

export function eligibleMissions(game) {
  const counts = buildingCounts(game);
  const extensions = activeExtensions(game);
  const vehicleTypes = new Set(game.units.map(unit => unit.vehicle_type));
  const coveredCities = new Set(game.bases.map(base => base.city));
  return MISSION_DEFINITIONS.filter(def => {
    const enoughBuildings = Object.entries(def.min || {}).every(([service, count]) => (counts[service] || 0) >= count);
    const hasExtensions = (def.extension || []).every(id => extensions.has(id));
    const hasVehicles = (def.vehicle || []).every(id => vehicleTypes.has(id));
    const hasPoi = !def.poi || POIS.some(poi => poi.type === def.poi && coveredCities.has(poi.city));
    return enoughBuildings && hasExtensions && hasVehicles && hasPoi;
  });
}

export function weightedMission(game) {
  const pool = eligibleMissions(game);
  if (!pool.length) return MISSION_DEFINITIONS[1];
  const weight = item => item.weight * (item.specialization && game.bases.some(base => base.specialization === item.specialization) ? 2.25 : 1);
  const total = pool.reduce((sum, item) => sum + weight(item), 0);
  let roll = Math.random() * total;
  return pool.find(item => (roll -= weight(item)) <= 0) || pool[pool.length - 1];
}

export function progressionSnapshot(game, services) {
  const eligible = eligibleMissions(game);
  return {
    mission_cap: missionCap(game),
    unlocked_missions: eligible.map(item => item.scenario),
    next_building_costs: Object.fromEntries(Object.entries(services).map(([id, service]) => [id, nextBuildingCost(game, id, service.base_price)])),
    building_counts: buildingCounts(game),
  };
}

export function extensionsFor(service) {
  return EXTENSIONS[service] || [];
}

export function specializationsFor(service) {
  return SPECIALIZATIONS[service] || [];
}
