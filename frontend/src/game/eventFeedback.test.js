import { detectGameFeedback, failureFeedback } from './eventFeedback';

const game = overrides => ({
  completed: 0, failed: 0, earned: 0, level: 1,
  bases: [], facilities: [], units: [], trainings: [], history: [], logs: [],
  ...overrides,
});

test('prioritizes a completed mission and includes its reward', () => {
  const previous = game();
  const next = game({ completed: 1, earned: 1200, history: [{ id:'mission-1', title:'Incêndio', success:true, reward:1200 }] });
  expect(detectGameFeedback(previous, next)).toMatchObject({ variant:'mission', tone:'positive', title:'Missão concluída' });
});

test('shows a distinct failure for an expired mission', () => {
  const previous = game();
  const next = game({ failed: 1, history: [{ id:'mission-1', title:'Acidente', success:false, reward:0 }] });
  expect(detectGameFeedback(previous, next)).toMatchObject({ variant:'mission-failed', tone:'negative' });
});

test('detects construction, training and personnel changes', () => {
  expect(detectGameFeedback(game(), game({ bases:[{ id:'base-1', name:'Bombeiros · Faro' }] }))).toMatchObject({ variant:'construction' });
  expect(detectGameFeedback(
    game({ trainings:[{ id:'course-1', status:'active' }] }),
    game({ trainings:[{ id:'course-1', status:'completed', count:2 }] }),
  )).toMatchObject({ variant:'training' });
  expect(detectGameFeedback(
    game({ bases:[{ id:'base-1', personnel:4 }] }),
    game({ bases:[{ id:'base-1', personnel:6 }] }),
  )).toMatchObject({ variant:'hire' });
  expect(detectGameFeedback(
    game({ bases:[{ id:'base-1', personnel:6 }] }),
    game({ bases:[{ id:'base-1', personnel:4 }] }),
  )).toMatchObject({ variant:'dismissal', tone:'negative' });
});

test('turns rejected actions into contextual negative feedback', () => {
  expect(failureFeedback('Orçamento insuficiente.', 'buy_vehicle')).toMatchObject({
    variant:'failure', tone:'negative', title:'Aquisição recusada', detail:'Orçamento insuficiente.',
  });
});
