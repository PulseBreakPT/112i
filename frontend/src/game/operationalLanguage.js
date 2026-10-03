/* PT-PT operational language, applied only to display fields.
   State keys, IDs, prices, answer indices and saved progress are never translated.
   Directions address the player as tu; radio logs and operational states are impersonal. */
const PHRASES = {
  'Failed to fetch': 'Não foi possível contactar o serviço de percursos. Verifica a ligação e tenta novamente.',
  'Load failed': 'Não foi possível contactar o serviço de percursos. Verifica a ligação e tenta novamente.',
  'NetworkError when attempting to fetch resource.': 'Não foi possível contactar o serviço de percursos. Verifica a ligação e tenta novamente.',
  'Emergência médica': 'INEM',
  'Polícia': 'PSP',
  'Veículo de combate a incêndios': 'Viatura de combate a incêndios',
  'Carro-patrulha': 'Viatura de patrulha',
  'Auto-Escada': 'Autoescada',
  'Matérias Perigosas': 'Matérias perigosas',
  'Posto Médico Avançado': 'Posto médico avançado',
  'Unidade Cinotécnica': 'Meio cinotécnico',
  'Unidade cinotécnica': 'Intervenção cinotécnica',
  'Ordem Pública': 'Meio de ordem pública',
  'Veículo de Comando': 'Viatura de comando',
  'Veículo Tanque': 'Viatura-tanque',
  'Veículo de Desencarceramento': 'Viatura de desencarceramento',
  'Plataforma Elevatória': 'Plataforma elevatória',
  'Ambulância de Transporte': 'Ambulância de transporte',
  'Motociclo de Emergência': 'Motociclo de emergência médica',
  'Helicóptero de Emergência Médica': 'Helicóptero de emergência médica',
  'Unidade de Trânsito': 'Viatura de trânsito',
  'Carrinha de Transporte de Detidos': 'Viatura de transporte de detidos',
  'Unidade Tática': 'Meio de intervenção policial',
  'Meios aéreos e altura': 'Intervenção em altura',
  'Combate florestal': 'Combate a incêndios rurais',
  'Triagem e catástrofe': 'Triagem em situações de catástrofe',
  'Catástrofe e triagem': 'Resposta a múltiplas vítimas',
  'Emergência geral': 'Emergência médica geral',
  'Suporte avançado': 'Suporte avançado de vida',
  'Tipo de veículo inválido.': 'Tipo de viatura inválido. Seleciona uma viatura do catálogo.',
  'Unidade indisponível.': 'Meio indisponível. Seleciona outro meio.',
  'Seleciona unidades disponíveis.': 'Seleciona os meios disponíveis.',
  'Envia apenas os meios necessários.': 'Mobiliza apenas os meios necessários para a ocorrência.',
  'Não existem meios disponíveis para este despacho.': 'Não há meios disponíveis para esta mobilização.',
  'Percurso rodoviário não preparado. Tenta despachar novamente.': 'Percurso por calcular. Tenta mobilizar os meios novamente.',
  'Sem ligação rodoviária para esta ocorrência.': 'Sem ligação rodoviária à ocorrência. Seleciona meios com acesso ao local.',
  'Ocorrência já encerrada.': 'Ocorrência encerrada. Seleciona outra ocorrência.',
  'Chamada já encerrada.': 'Chamada encerrada. Consulta o registo da ocorrência.',
  'Escolha inválida.': 'Opção inválida. Seleciona uma das orientações apresentadas.',
  'Base inválida.': 'Base operacional inválida. Seleciona outra base.',
  'Garagem cheia.': 'Capacidade da garagem atingida. Amplia a base ou seleciona outra.',
  'Capacidade de pessoal atingida.': 'Capacidade de pessoal atingida. Amplia a base para recrutares mais elementos.',
  'Não existem elementos livres suficientes.': 'Não há elementos disponíveis em número suficiente.',
  'Sem células disponíveis.': 'Não há celas disponíveis.',
  'Os RAR base não podem ser eliminados.': 'Não podes eliminar os regulamentos predefinidos.',
  'O RAR não encontrou meios compatíveis disponíveis.': 'Não há meios disponíveis que correspondam ao regulamento e à ocorrência.',
  'Ocorrência ou regulamento inválido.': 'Ocorrência ou regulamento inválido. Volta a selecionar os dados.',
  'Ação desconhecida.': 'Ação não reconhecida. Tenta novamente.',
  'Localização desconhecida.': 'Localização não reconhecida. Seleciona outro local.',
  'Orientação insegura. A central corrigiu a indicação. Priorize a segurança do interlocutor.': 'Orientação corrigida pela central. Dá prioridade à segurança do interlocutor.',
  'Orientação insegura. A central corrigiu a indicação. Prioriza a segurança do interlocutor.': 'Orientação corrigida pela central. Dá prioridade à segurança do interlocutor.',
  'Portugal · Central do Porto operacional. Modo local ativo.': 'Central do Porto operacional. Progresso guardado neste navegador.',
  'O civil afastou-se para um local seguro. A equipa recebeu a indicação de uma possível vítima.': 'Interlocutor em segurança. Informação sobre uma possível vítima transmitida aos meios de socorro.',
  'A vítima ficou acompanhada e não foi mobilizada.': 'Vítima acompanhada, sem deslocação. Informação transmitida à equipa de emergência médica.',
  'A vítima ficou acompanhada e não foi mobilizada. Ambulância informada.': 'Vítima acompanhada, sem deslocação. Informação transmitida à equipa de emergência médica.',
  // Choices are actions for the player, not direct quotations addressed to a caller.
  'Afaste-se do edifício e aguarde as equipas no exterior.': 'Pede ao interlocutor que se afaste do edifício e aguarde as equipas no exterior.',
  'Entre e procure o seu colega.': 'Pede ao interlocutor que entre no edifício para procurar o colega.',
  'Abra todas as portas do armazém.': 'Pede ao interlocutor que abra todas as portas do armazém.',
  'Dê-lhe um copo de água.': 'Pede ao interlocutor que dê água à vítima.',
  'Mantenha a calma. Diga-me se ele respira normalmente.': 'Pede ao interlocutor que mantenha a calma e indique se a vítima respira normalmente.',
  'Deixe-o sozinho e procure ajuda.': 'Pede ao interlocutor que deixe a vítima sozinha para procurar ajuda.',
  'Persiga o suspeito.': 'Pede ao interlocutor que persiga o suspeito.',
  'Persiga o suspeito e tente detê-lo.': 'Pede ao interlocutor que persiga e tente deter o suspeito.',
  'Saia para tirar uma fotografia.': 'Pede ao interlocutor que se aproxime para tirar uma fotografia.',
  'Saia do esconderijo para tirar uma fotografia.': 'Pede ao interlocutor que saia do local onde está protegido para tirar uma fotografia.',
  'Fique num local seguro e descreva o suspeito.': 'Pede ao interlocutor que permaneça num local seguro e descreva o suspeito.',
  'Afaste-se do combustível e não mova os feridos.': 'Pede ao interlocutor que se afaste do combustível e não desloque os feridos.',
  'Puxe o condutor para fora.': 'Pede ao interlocutor que retire o condutor da viatura.',
  'Puxe o condutor para fora imediatamente.': 'Pede ao interlocutor que retire imediatamente o condutor da viatura.',
  'Aproxime-se da fuga.': 'Pede ao interlocutor que se aproxime da fuga de combustível.',
  'Aproxime-se para verificar a fuga de combustível.': 'Pede ao interlocutor que se aproxime para verificar a fuga de combustível.',
  'Tente apagar sozinho.': 'Pede ao interlocutor que tente extinguir o incêndio sem apoio.',
  'Tente apagar o incêndio sozinho.': 'Pede ao interlocutor que tente extinguir o incêndio sem apoio.',
  'Afaste-se e indique um acesso seguro.': 'Pede ao interlocutor que se afaste e indique um acesso seguro.',
  'Afaste-se das chamas e indique um acesso seguro.': 'Pede ao interlocutor que se afaste das chamas e indique um acesso seguro.',
  'Espere para ver.': 'Pede ao interlocutor que aguarde para observar a evolução do incêndio.',
  'Espere para ver se o fogo se apaga.': 'Pede ao interlocutor que aguarde para ver se o incêndio se extingue.',
  'Intervenha.': 'Pede ao interlocutor que intervenha no confronto.',
  'Intervenha para separar os grupos.': 'Pede ao interlocutor que intervenha para separar os grupos.',
  'Afaste-se e aguarde a patrulha.': 'Pede ao interlocutor que se afaste e aguarde a patrulha num local seguro.',
  'Afaste-se e aguarde a patrulha num local seguro.': 'Pede ao interlocutor que se afaste e aguarde a patrulha num local seguro.',
  'Aproxime-se e filme.': 'Pede ao interlocutor que se aproxime para filmar o confronto.',
  'Aproxime-se e filme a discussão.': 'Pede ao interlocutor que se aproxime para filmar o confronto.',
  'Ajude-a a caminhar.': 'Pede ao interlocutor que ajude a vítima a caminhar.',
  'Ajude-a a caminhar até à ambulância.': 'Pede ao interlocutor que ajude a vítima a caminhar até à ambulância.',
  'Não a mova e aguarde o socorro.': 'Pede ao interlocutor que não desloque a vítima e aguarde os meios de socorro.',
  'Não a mova. Mantenha-a confortável e aguarde o socorro.': 'Pede ao interlocutor que não desloque a vítima, a mantenha confortável e aguarde os meios de socorro.',
  'Deixe-a sozinha.': 'Pede ao interlocutor que deixe a vítima sozinha.',
  'Deixe-a descansar sozinha.': 'Pede ao interlocutor que deixe a vítima a descansar sozinha.',
  'Use o elevador para sair.': 'Pede ao interlocutor que utilize o elevador para sair.',
  'Feche a porta, vá para uma janela e aguarde instruções.': 'Pede ao interlocutor que feche a porta, se aproxime de uma janela e aguarde instruções.',
  'Desça pelas escadas cheias de fumo.': 'Pede ao interlocutor que desça pelas escadas com fumo.',
  'Aproxime-se para ler o rótulo.': 'Pede ao interlocutor que se aproxime para ler o rótulo do produto.',
  'Afaste-se contra o vento e impeça outras pessoas de entrar.': 'Pede ao interlocutor que se afaste contra o vento e avise outras pessoas para não entrarem.',
  'Tente tapar a fuga.': 'Pede ao interlocutor que tente vedar a fuga.',
  'Espere até amanhã.': 'Pede ao interlocutor que aguarde até ao dia seguinte.',
  'Reúna uma descrição, roupa e último local conhecido.': 'Recolhe a descrição da pessoa, o vestuário e o último local onde foi vista.',
  'Procure sozinho dentro da mata.': 'Pede ao interlocutor que procure a pessoa na mata sem apoio.',
  'Mova todas as vítimas para o mesmo local.': 'Pede ao interlocutor que desloque todas as vítimas para o mesmo local.',
  'Mantenha uma via livre e indique perigos imediatos.': 'Pede ao interlocutor que mantenha o acesso livre e indique os perigos imediatos.',
  'Abandone o local sem dar referências.': 'Pede ao interlocutor que abandone o local sem indicar referências.',
  'Afaste-se, avise outras pessoas e aguarde num local seguro.': 'Pede ao interlocutor que se afaste, avise outras pessoas e aguarde num local seguro.',
  'Aproxime-se para confirmar a origem.': 'Pede ao interlocutor que se aproxime para confirmar a origem do incêndio.',
  'Entre no local para recuperar objetos.': 'Pede ao interlocutor que entre no local para recuperar objetos.',
  'Mantenha a zona segura, verifique a respiração e siga as instruções.': 'Pede ao interlocutor que mantenha a zona segura, verifique a respiração e siga as instruções da central.',
  'Dê comida e água a todas as vítimas.': 'Pede ao interlocutor que dê alimentos e água a todas as vítimas.',
  'Transporte imediatamente as vítimas no seu veículo.': 'Pede ao interlocutor que transporte imediatamente as vítimas na própria viatura.',
  'Mantenha distância, procure abrigo e descreva os envolvidos.': 'Pede ao interlocutor que mantenha a distância, procure abrigo e descreva os envolvidos.',
  'Confronte os suspeitos até a polícia chegar.': 'Pede ao interlocutor que confronte os suspeitos até à chegada da patrulha.',
  'Siga os envolvidos sem ser visto.': 'Pede ao interlocutor que siga os envolvidos sem ser visto.',
  'Afaste-se dos perigos, liberte os acessos e indique o número de vítimas.': 'Pede ao interlocutor que se afaste dos perigos, mantenha os acessos livres e indique o número de vítimas.',
  'Entre novamente para procurar outras pessoas.': 'Pede ao interlocutor que volte a entrar para procurar outras pessoas.',
  'Bloqueie a estrada com o seu veículo.': 'Pede ao interlocutor que bloqueie a estrada com a própria viatura.',
};

const EXTENSION_LABELS = {
  aerial: 'intervenção em altura', wildfire: 'combate a incêndios rurais',
  hazmat: 'matérias perigosas', water: 'salvamento aquático',
  'advanced-care': 'suporte avançado de vida', 'hospital-network': 'rede hospitalar',
  'mass-casualty': 'resposta a múltiplas vítimas', canine: 'intervenção cinotécnica',
  'public-order': 'ordem pública', explosives: 'inativação de explosivos',
};

export function operationalText(value) {
  if (typeof value !== 'string') return value;
  if (Object.prototype.hasOwnProperty.call(PHRASES, value)) return PHRASES[value];
  return value
    .replace(/\bextensão (aerial|wildfire|hazmat|water|advanced-care|hospital-network|mass-casualty|canine|public-order|explosives)\b/g, (_, id) => `extensão de ${EXTENSION_LABELS[id]}`)
    .replace(/(\d+) unidade\(s\) mobilizada\(s\)/g, (_, count) => `${count} meio${count === '1' ? '' : 's'} mobilizado${count === '1' ? '' : 's'}`)
    .replace(/(\d+) elemento\(s\)/g, (_, count) => `${count} elemento${count === '1' ? '' : 's'}`)
    .replace(/\bNova unidade\b/g, 'Nova viatura')
    .replace(/unidade\(s\) mobilizada\(s\)/g, 'meio(s) mobilizado(s)')
    .replace(/\bTripulação da\b/g, 'Equipa da')
    .replace(/\bcoordenação interagências\b/g, 'articulação entre serviços')
    .replace(/\bcoordenação de (\d+) serviço\(s\)/g, (_, count) => count === '1' ? 'intervenção de um serviço' : `articulação entre ${count} serviços`)
    .replace(/Operação de dificuldade /g, 'Ocorrência de complexidade ')
    .replace(/\bveículos\b/g, 'viaturas')
    .replace(/\bveículo\b/g, 'viatura')
    .replace(/\bVeículo\b/g, 'Viatura')
    .replace(/\bCarro-patrulha\b/g, 'Viatura de patrulha')
    .replace(/\bEmergência médica · /g, 'INEM · ')
    .replace(/\bPolícia · /g, 'PSP · ')
    .replace(/\bAuto-Escada\b/g, 'Autoescada')
    .replace(/\bModo local ativo\./g, 'Progresso guardado neste navegador.');
}

const labelled = item => ({ ...item, name: operationalText(item.name) });
const labelledGroups = groups => Object.fromEntries(Object.entries(groups || {}).map(([key, items]) => [key, items.map(labelled)]));

export function presentWorldCopy(world) {
  return {
    ...world,
    services: Object.fromEntries(Object.entries(world.services).map(([key, service]) => [key, { ...labelled(service), vehicle: operationalText(service.vehicle) }])),
    vehicle_catalog: labelledGroups(world.vehicle_catalog),
    extensions: labelledGroups(world.extensions),
    specializations: labelledGroups(world.specializations),
    training_catalog: world.training_catalog.map(labelled),
    mission_definitions: world.mission_definitions.map(labelled),
    facility_catalog: Object.fromEntries(Object.entries(world.facility_catalog).map(([key, item]) => [key, labelled(item)])),
  };
}

export function presentGameCopy(game) {
  return {
    ...game,
    incidents: game.incidents.map(incident => {
      const confidence=Number(incident.intel_confidence)||0;
      const revealed=incident.intel_revealed===true||incident.reconnaissance?.complete===true;
      const requiredVehicles=revealed
        ? [...(incident.required_vehicle_types||[])]
        : confidence>=58 ? (incident.required_vehicle_types||[]).slice(0,Math.max(1,Math.ceil((incident.required_vehicle_types||[]).length/2))) : [];
      const requiredTrainings=revealed
        ? [...(incident.required_trainings||[])]
        : confidence>=68 ? (incident.required_trainings||[]).slice(0,1) : [];
      return {
        ...incident,
        needs:revealed?{...(incident.needs||{})}:{...(incident.reported_needs||incident.needs||{})},
        casualties:revealed?(incident.casualties||0):(incident.reported_casualties??incident.casualties??0),
        required_vehicle_types:requiredVehicles,
        required_trainings:requiredTrainings,
        intelligence_limited:!revealed,
        title: operationalText(incident.title),
        description: operationalText(incident.description),
        definition: operationalText(incident.definition),
        call: incident.call && { ...incident.call, choices: incident.call.choices.map(operationalText) },
        call_result: incident.call_result && { ...incident.call_result, feedback: operationalText(incident.call_result.feedback) },
      };
    }),
    units: game.units.map(unit => {
      const identifier = unit.name.match(/^(.*)-(\d+)$/);
      return { ...unit, name: identifier ? `${operationalText(identifier[1])}-${identifier[2]}` : operationalText(unit.name) };
    }),
    bases: game.bases.map(labelled),
    facilities: (game.facilities || []).map(labelled),
    command_centers: (game.command_centers || []).map(labelled),
    player_pois: (game.player_pois || []).map(labelled),
    personnel: (game.personnel || []).map(labelled),
    logs: game.logs.map(entry => ({ ...entry, text: operationalText(entry.text) })),
    history: game.history.map(entry => ({ ...entry, title: operationalText(entry.title) })),
    patients: (game.patients || []).map(item => ({ ...item, incident: operationalText(item.incident) })),
    prisoners: (game.prisoners || []).map(item => ({ ...item, incident: operationalText(item.incident) })),
  };
}
