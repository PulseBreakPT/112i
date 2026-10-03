// Referências económicas portuguesas 2025-2026 usadas pelo Distrito 112.
// Valores de aquisição/construção são preços-base sem IVA. O motor aplica IVA
// por região e separa investimento total, comparticipação pública e esforço próprio.

export const PORTUGAL_VAT = Object.freeze({
  mainland: .23,
  madeira: .22,
  'sao-miguel': .16,
  terceira: .16,
  azores: .16,
});

export const PORTUGAL_ECONOMY = Object.freeze({
  startingBudget: 2500000,
  reserveFloor: 250000,
  fundingInterval: 600,
  employerCostFactor: 1.40,
  weeklyFixedBuildingRate: Object.freeze({
    fire:.035/52,
    medical:.04/52,
    police:.035/52,
    command_center:.04/52,
    hospital:.06/52,
    prison:.04/52,
    academy:.04/52,
    workshop_logistics:.03/52,
    heliport:.03/52,
  }),
  hemWeeklyContract: Math.round(3900000/52),
  dieselPerLitre: 2.221,
  petrol95PerLitre: 2.115,
  waterPerLitre: .00137,
  foamPerLitre: 7,
  oxygenBottleAverage: 32,
  capitalGrantRate: Object.freeze({
    vehicle: .70,
    aircraft: .82,
    base: .85,
    command: .85,
    facility: .90,
    hospital: .95,
    extension: .75,
    upgrade: .75,
    equipment: .70,
  }),
  buildings: Object.freeze({
    fire: 3500000,
    medical: 1200000,
    police: 2200000,
    command_center: 4000000,
    hospital: 150000000,
    prison: 60000000,
    academy: 5000000,
    workshop_logistics: 1500000,
    heliport: 260000,
  }),
  baseUpgrade: Object.freeze({
    fire: 450000,
    medical: 300000,
    police: 350000,
  }),
  facilityUpgrade: Object.freeze({
    hospital: 15000000,
    prison: 5000000,
    academy: 750000,
  }),
  hospitalSpecialties: Object.freeze({
    urgency: 0,
    trauma: 5000000,
    burns: 8000000,
    pediatrics: 5000000,
    cardiology: 7500000,
    neurology: 8000000,
    obstetrics: 6000000,
    'intensive-care': 12000000,
  }),
  extensions: Object.freeze({
    aerial: 650000,
    wildfire: 350000,
    hazmat: 550000,
    water: 300000,
    'advanced-care': 400000,
    'hospital-network': 250000,
    'mass-casualty': 650000,
    canine: 250000,
    'public-order': 450000,
    explosives: 700000,
  }),
  vehicles: Object.freeze({
    'fire-engine': 275000,
    ladder: 1275000,
    'wildfire-unit': 255000,
    'hazmat-unit': 350000,
    'command-unit': 95000,
    tanker: 265000,
    'light-wildfire': 90000,
    'heavy-rescue': 305000,
    'aerial-platform': 850000,

    ambulance: 92000,
    vmer: 85000,
    'mass-casualty-unit': 230000,
    'patient-transport': 75000,
    siv: 100000,
    'medical-motorcycle': 25000,
    umipe: 75000,
    tip: 150000,
    'medical-helicopter': 3900000,

    patrol: 38000,
    'canine-unit': 50000,
    'riot-unit': 95000,
    'traffic-unit': 45000,
    'investigation-unit': 38000,
    'prisoner-van': 65000,
    'tactical-unit': 120000,
  }),
  training: Object.freeze({
    hazmat: 950,
    rescue: 750,
    wildfire: 450,
    command: 1750,
    'advanced-care': 1200,
    triage: 750,
    aeromedical: 2500,
    psychology: 600,
    'pediatric-transport': 1200,
    canine: 1800,
    traffic: 550,
    custody: 450,
    investigation: 950,
    'public-order': 950,
  }),
  recruitment: Object.freeze({
    fire: 2500,
    medical: 1800,
    police: 2500,
  }),
  salaries: Object.freeze({
    fire: 1542,
    medical: 1341,
    police: 1998,
  }),
});

export const vatRateForLand = land => PORTUGAL_VAT[land] ?? PORTUGAL_VAT.mainland;
export const procurementTotal = (net, land='mainland') => Math.round(Math.max(0,Number(net)||0) * (1 + vatRateForLand(land)));
export const capitalGrantRate = kind => PORTUGAL_ECONOMY.capitalGrantRate[kind] ?? .70;

export function capitalQuote(net, land='mainland', kind='equipment'){
  const netCost=Math.max(0,Math.round(Number(net)||0));
  const vatRate=vatRateForLand(land);
  const vat=Math.round(netCost*vatRate);
  const total=netCost+vat;
  const grantRate=capitalGrantRate(kind);
  const grant=Math.round(total*grantRate);
  return {net:netCost,vat_rate:vatRate,vat,total,grant_rate:grantRate,grant,own:Math.max(0,total-grant)};
}

export const baseUpgradeNet = base => {
  const service=base?.service||'fire';
  const level=Math.max(1,Number(base?.level)||1);
  const reference=PORTUGAL_ECONOMY.baseUpgrade[service]||350000;
  return Math.round(reference*(1+(level-1)*.32));
};

export const facilityUpgradeNet = facility => {
  const level=Math.max(1,Number(facility?.level)||1);
  const reference=PORTUGAL_ECONOMY.facilityUpgrade[facility?.type]||1000000;
  return Math.round(reference*(1+(level-1)*.28));
};

export const recruitmentCost = (service, amount=1, immediate=false) => {
  const base=PORTUGAL_ECONOMY.recruitment[service]||2200;
  return Math.round(base*Math.max(1,Number(amount)||1)*(immediate?1.18:1));
};

export const monthlySalaryFor = (service, serviceYears=0, skill=60) => {
  const base=PORTUGAL_ECONOMY.salaries[service]||1500;
  const experience=Math.min(650,Math.max(0,Number(serviceYears)||0)*24);
  const merit=Math.max(-60,Math.min(220,(Math.max(0,Number(skill)||60)-60)*4));
  return Math.round(base+experience+merit);
};

export const monthlyEmployerCost = salary => Math.round(Math.max(0,Number(salary)||0)*PORTUGAL_ECONOMY.employerCostFactor);
export const weeklyEmployerCost = salary => Math.round(monthlyEmployerCost(salary)*12/52);

export const weeklyBuildingFixedCost = type => {
  const asset=PORTUGAL_ECONOMY.buildings[type]||0;
  const rate=PORTUGAL_ECONOMY.weeklyFixedBuildingRate[type]||0;
  return Math.round(asset*rate);
};

export const vehicleMaintenanceReserveRate = vehicleClass => vehicleClass==='air' ? .04 : ['heavy','special'].includes(vehicleClass) ? .10 : .075;
