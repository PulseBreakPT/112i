import { buildIncidentDoctrine, deteriorateVictimStates, initialiseVictimStates, missionPerformance, rarityLevelFor } from './missionDoctrine';

describe('missionDoctrine', () => {
  test('catástrofe é nível 6 e requer comando e capacidade multivítimas', () => {
    const scenario={title:'Sismo com colapsos urbanos',service:'fire',priority:1,needs:{fire:5,medical:5,police:4}};
    const definition={name:scenario.title,tier:4,vehicle:[]};
    const doctrine=buildIncidentDoctrine(definition,scenario);
    expect(rarityLevelFor(definition,scenario)).toBe(6);
    expect(doctrine.category).toBe('disaster');
    expect(doctrine.mandatory_vehicle_types).toEqual(expect.arrayContaining(['command-unit','mass-casualty-unit']));
  });

  test('encarceramento intermédio recomenda desencarceramento e trânsito sem bloquear early game', () => {
    const scenario={title:'Despiste com vítima encarcerada',service:'fire',priority:2,needs:{fire:2,medical:1,police:1}};
    const doctrine=buildIncidentDoctrine({name:scenario.title,tier:2,vehicle:[]},scenario);
    expect(doctrine.category).toBe('road');
    expect(doctrine.recommended_vehicle_types).toEqual(expect.arrayContaining(['heavy-rescue','traffic-unit']));
  });

  test('deterioração conserva o número de vítimas e aumenta a gravidade', () => {
    const next=deteriorateVictimStates({light:1,moderate:0,severe:0,critical:0,pcr:0},()=>0);
    expect(Object.values(next).reduce((sum,value)=>sum+value,0)).toBe(1);
    expect(next.moderate).toBe(1);
  });

  test('perfil clínico inicial conserva o total', () => {
    const states=initialiseVictimStates(7,5,()=>.5);
    expect(Object.values(states).reduce((sum,value)=>sum+value,0)).toBe(7);
  });

  test('boa resposta aumenta recompensa e deterioração reduz o resultado', () => {
    const base={created:0,response_deadline:100,response_arrived_at:30,needs:{medical:1},required_vehicle_types:['ambulance'],recommended_vehicle_types:[],escalation_stage:0,clinical_deteriorations:0};
    const good=missionPerformance(base,[{vehicle_type:'ambulance'}],40);
    const degraded=missionPerformance({...base,clinical_deteriorations:4},[{vehicle_type:'ambulance'}],40);
    expect(good.multiplier).toBeGreaterThan(1);
    expect(degraded.multiplier).toBeLessThan(good.multiplier);
  });
});
