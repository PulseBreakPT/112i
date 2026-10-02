import {
  incidentMarkerKind,
  incidentMapState,
  incidentPrimaryService,
  isIncidentVisibleOnMap,
} from './incidentMapPresentation';

describe('incident map presentation', () => {
  test('uses lungs for asphyxia and carbon monoxide incidents', () => {
    expect(incidentMarkerKind({title:'Pessoa com asfixia'})).toBe('asphyxia');
    expect(incidentMarkerKind({title:'Intoxicação por monóxido de carbono'})).toBe('asphyxia');
  });

  test('uses handcuffs for detention-oriented police incidents', () => {
    expect(incidentMarkerKind({title:'Fuga coletiva de detidos',service:'police'})).toBe('custody');
    expect(incidentMarkerKind({title:'Assalto a estabelecimento',service:'police',detainees:1})).toBe('custody');
  });

  test('keeps waiting, enroute and onscene incidents visible', () => {
    expect(isIncidentVisibleOnMap({status:'waiting'})).toBe(true);
    expect(isIncidentVisibleOnMap({status:'enroute'})).toBe(true);
    expect(isIncidentVisibleOnMap({status:'onscene'})).toBe(true);
    expect(isIncidentVisibleOnMap({status:'resolved'})).toBe(false);
  });

  test('derives primary service from needs when explicit service is absent', () => {
    expect(incidentPrimaryService({needs:{medical:2,fire:1,police:1}})).toBe('medical');
  });

  test('maps operational states for marker styling', () => {
    expect(incidentMapState({status:'waiting'})).toBe('pending');
    expect(incidentMapState({status:'enroute'})).toBe('active');
    expect(incidentMapState({status:'onscene'})).toBe('onscene');
  });
});
