const normalise = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const SERVICE_IDS = new Set(['fire','medical','police']);
const ACTIVE_STATUSES = new Set(['waiting','pending','active','dispatching','enroute','onscene']);

export function incidentPrimaryService(incident = {}) {
  if (SERVICE_IDS.has(incident.service)) return incident.service;
  const needs = Object.entries(incident.needs || {})
    .filter(([service]) => SERVICE_IDS.has(service))
    .sort((a,b) => (Number(b[1]) || 0) - (Number(a[1]) || 0));
  if (needs.length) return needs[0][0];
  if (['medical'].includes(incident.category)) return 'medical';
  if (['crime','police_patrol','public_order','search','traffic','explosives'].includes(incident.category)) return 'police';
  return 'fire';
}

export function isIncidentVisibleOnMap(incident = {}) {
  return ACTIVE_STATUSES.has(incident.status || 'waiting');
}

export function incidentMarkerKind(incident = {}) {
  const text = normalise([
    incident.title,
    incident.definition,
    incident.description,
    incident.category,
    incident.category_label,
    incident.specialization,
  ].filter(Boolean).join(' '));

  if (/asfix|sufoc|insuficiencia respiratoria|dificuldade respiratoria|inala|monoxido|fumo inalado/.test(text)) return 'asphyxia';
  if (/avc|neurolog|convuls|cerebral/.test(text)) return 'neurology';
  if (/parto|obstetr|gravidez|neonat|pediatr/.test(text)) return 'obstetric';
  if (/cardiorresp|paragem|enfarte|coronar|dor torac|cardiac/.test(text)) return 'cardiac';
  if (/afog|aquatic|praia|rio|mar | na agua|queda na agua/.test(text)) return 'water';
  if (/explosiv|bomba|engenho/.test(text)) return 'explosives';
  if (/quimic|hazmat|materias perigosas|toxic|derrame|fuga de gas|intoxicacao/.test(text)) return 'hazmat';
  if (/incendio florestal|incendio rural|vegetacao|fogueira|mata|frente florestal/.test(text)) return 'wildfire';
  if (/incendio|fogo|chama|alarme de incendio|explosao domestica/.test(text)) return 'fire';
  if (/descarril|ferroviar/.test(text)) return 'rail';
  if (/aeronave|aereo|aviao/.test(text)) return 'air';
  if (/autocarro/.test(text)) return 'bus';
  if (/mota|motocic/.test(text)) return 'motorcycle';
  if (/colis|despiste|atropel|rodoviar|acidente em massa|veiculo|transito|perseguicao/.test(text)) return 'road';
  if (/desaparecid|busca de pessoa|desaparecimento|investigacao|cena de crime/.test(text)) return 'search';
  if (/detid|prisao|custodia|assalto|roubo|sequestro|trafico|barricad|furto|violencia domestica|agressao/.test(text) || (incident.detainees || 0) > 0) return 'custody';
  if (/motim|disturbio|confronto|manifestacao|ordem publica|evento desportivo/.test(text)) return 'public-order';
  if (/tempestade|cheia|inundacao|temporal/.test(text)) return 'weather';
  if (/colapso|soterrad|andaime|varanda|estrutura|queda de grande altura|queda em obra|fachada|telhado/.test(text)) return 'rescue';

  const categoryKinds = {
    urban_fire:'fire',
    wildfire:'wildfire',
    road:'road',
    rescue:'rescue',
    water_rescue:'water',
    medical:'medical',
    police_patrol:'police',
    traffic:'road',
    crime:'custody',
    public_order:'public-order',
    search:'search',
    explosives:'explosives',
    hazmat:'hazmat',
    infrastructure:'rescue',
    weather:'weather',
    disaster:'disaster',
    multi:'multi',
  };
  return categoryKinds[incident.category] || incidentPrimaryService(incident);
}

export function incidentMapState(incident = {}) {
  if (incident.status === 'waiting' || incident.status === 'pending') return 'pending';
  if (incident.status === 'onscene') return 'onscene';
  return 'active';
}

export function incidentMapStatusLabel(incident = {}) {
  if (incident.status === 'waiting' || incident.status === 'pending') return 'A aguardar mobilização';
  if (incident.status === 'enroute' || incident.status === 'dispatching') return 'Meios em deslocação';
  if (incident.status === 'onscene') return 'Equipas no local';
  return 'Ocorrência ativa';
}
