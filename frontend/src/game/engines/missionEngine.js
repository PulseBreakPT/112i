export const VEHICLE_TRAINING = {
  'wildfire-unit':'wildfire',
  tanker:'wildfire',
  'heavy-rescue':'rescue',
  'command-unit':'command',
  'medical-helicopter':'aeromedical',
  'traffic-unit':'traffic',
  'prisoner-van':'custody',
};

export const PHASE_REQUIREMENTS = {
  fire:[
    null,
    incident=>incident.priority===1?{vehicles:['command-unit'],trainings:['command'],needs:{fire:1}}:null,
    incident=>(incident.required_vehicle_types||[]).includes('heavy-rescue')||/colisão|encarcer/i.test(incident.title)?{vehicles:['heavy-rescue'],trainings:['rescue']}:incident.zone_risk?.includes('florestal')?{vehicles:['wildfire-unit'],trainings:['wildfire'],needs:{fire:1}}:null,
    incident=>incident.casualties>0?{needs:{medical:1}}:null,
  ],
  medical:[
    null,
    incident=>incident.casualties>=3||incident.large_scale?{vehicles:['mass-casualty-unit'],trainings:['triage'],needs:{medical:1}}:null,
    incident=>incident.casualties>=1?{vehicles:['vmer'],trainings:['advanced-care']}:null,
    incident=>incident.casualties>=5?{vehicles:['medical-helicopter'],trainings:['aeromedical']}:null,
  ],
  police:[
    null,
    incident=>incident.detainees>0?{vehicles:['prisoner-van'],trainings:['custody']}:null,
    incident=>/assalto|roubo|desaparecid|sequestro|tráfico/i.test(incident.title)?{trainings:['investigation'],needs:{police:1}}:null,
    incident=>incident.priority===1||incident.detainees>=3?{vehicles:['riot-unit'],trainings:['public-order'],needs:{police:1}}:null,
  ],
};

const INCIDENT_EVOLUTIONS = {
  0:{type:'expansion',title:'Incêndio industrial generalizado',add_needs:{fire:1,medical:1},reward_factor:1.55},
  3:{type:'follow_up',scenario:4,title:'Incêndio após colisão',trigger_progress:42},
  5:{type:'expansion',title:'Motim na via pública',add_needs:{police:2,medical:1},reward_factor:1.6},
  9:{type:'subsequent',scenario:9,title:'Busca alargada da pessoa desaparecida'},
};

export const operationalPhasesFor = service => service==='fire'
  ? ['Reconhecimento','Ataque inicial','Contenção','Rescaldo']
  : service==='medical'
    ? ['Triagem','Estabilização','Tratamento','Evacuação']
    : ['Avaliação de risco','Perímetro','Intervenção','Recolha de prova'];

export const generatedEvolution = (scenario,service,priority) => INCIDENT_EVOLUTIONS[scenario]||(priority===1?{type:'expansion',title:service==='fire'?'Incidente de grande dimensão':service==='medical'?'Emergência com múltiplas vítimas':'Operação policial alargada',add_needs:{[service]:1},reward_factor:1.3}:null);

export const vehicleTraining = (type,vehicleById) => vehicleById(type)?.training||VEHICLE_TRAINING[type]||null;

export const requiredTrainingsFor = (definition,vehicleById) => [...new Set([...(definition?.training||[]),...(definition?.vehicle||[]).map(type=>vehicleTraining(type,vehicleById))].filter(Boolean))];

export const trainedOnScene = (g,onscene,training) => onscene.flatMap(unit=>unit.personnel_ids||[]).map(id=>g.personnel.find(person=>person.id===id)).filter(Boolean).some(person=>(person.qualifications||[]).includes(training));

const vehicleCapabilityExists = (g,type,commandCenterId=null) => g.units.some(unit=>unit.vehicle_type===type&&(!commandCenterId||g.bases.find(base=>base.id===unit.base_id)?.command_center_id===commandCenterId));
const trainingCapabilityExists = (g,training,commandCenterId=null) => g.personnel.some(person=>(person.qualifications||[]).includes(training)&&(!commandCenterId||g.bases.find(base=>base.id===person.base_id)?.command_center_id===commandCenterId));

export const mergeIncidentRequirements = (g,inc,requirements,force=false) => {
  if(!requirements)return false;
  let changed=false;
  Object.entries(requirements.needs||{}).forEach(([service,count])=>{const value=(inc.needs[service]||0)+count;if(value!==inc.needs[service]){inc.needs[service]=value;changed=true;}});
  (requirements.vehicles||[]).forEach(type=>{if(!force&&!vehicleCapabilityExists(g,type,inc.command_center_id))return;if(!(inc.required_vehicle_types||[]).includes(type)){inc.required_vehicle_types=[...(inc.required_vehicle_types||[]),type];changed=true;}});
  (requirements.trainings||[]).forEach(training=>{if(!force&&!trainingCapabilityExists(g,training,inc.command_center_id))return;if(!(inc.required_trainings||[]).includes(training)){inc.required_trainings=[...(inc.required_trainings||[]),training];changed=true;}});
  if(changed)inc.required_personnel=Object.values(inc.needs||{}).reduce((sum,count)=>sum+count*2,0);
  return changed;
};

export const readinessFor = (g,inc,onscene) => ({
  services:Object.entries(inc.needs||{}).every(([service,count])=>onscene.filter(u=>u.service===service).length>=count),
  vehicles:(inc.required_vehicle_types||[]).every(type=>onscene.some(u=>u.vehicle_type===type)),
  personnel:onscene.reduce((sum,u)=>sum+(u.crew_assigned||0),0)>=(inc.required_personnel||0),
  trainings:(inc.required_trainings||[]).every(training=>trainedOnScene(g,onscene,training)),
});