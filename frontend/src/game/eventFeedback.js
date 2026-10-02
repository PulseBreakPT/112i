const currency = value => new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 }).format(value || 0) + ' €';

const event = (variant, tone, title, detail, priority = 0) => ({ variant, tone, title, detail, priority });

const newLogs = (previous, next) => {
  const known = new Set((previous?.logs || []).map(item => item.id));
  return (next?.logs || []).filter(item => !known.has(item.id));
};

const completedTraining = (previous, next) => (next?.trainings || []).find(item => {
  const before = (previous?.trainings || []).find(candidate => candidate.id === item.id);
  return item.status === 'completed' && before?.status !== 'completed';
});

const newlyBrokenUnit = (previous, next) => (next?.units || []).find(item => {
  const before = (previous?.units || []).find(candidate => candidate.id === item.id);
  return item.status === 'broken' && before?.status !== 'broken';
});

const totalPersonnel = game => (game?.bases || []).reduce((sum, base) => sum + (base.personnel || 0), 0);

export function detectGameFeedback(previous, next, action = 'tick') {
  if (!previous || !next) return null;
  const logs = newLogs(previous, next);
  const latestHistory = next.history?.find(item => !(previous.history || []).some(old => old.id === item.id));

  if ((next.failed || 0) > (previous.failed || 0) || latestHistory?.success === false) {
    return event('mission-failed', 'negative', 'Ocorrência não resolvida', `${latestHistory?.title || 'O prazo de resposta terminou'} · confiança pública reduzida`, 100);
  }
  if ((next.completed || 0) > (previous.completed || 0) || latestHistory?.success === true) {
    return event('mission', 'positive', 'Missão concluída', `${latestHistory?.title || 'Ocorrência resolvida'} · +${currency(latestHistory?.reward)}`, 100);
  }

  const training = completedTraining(previous, next);
  if (training) {
    const log = logs.find(item => item.text.startsWith('Formação concluída:'));
    return event('training', 'positive', 'Formação completa', log?.text.replace('Formação concluída: ', '') || `${training.count} elemento(s) qualificado(s)`, 85);
  }

  const broken = newlyBrokenUnit(previous, next);
  if (broken) return event('breakdown', 'negative', 'Avaria operacional', `${broken.name} ficou indisponível e entrou em reparação`, 85);

  if (next.bases.length > previous.bases.length) {
    const base = next.bases.find(item => !previous.bases.some(old => old.id === item.id));
    return event('construction', 'positive', base?.operational_at ? 'Obras iniciadas' : 'Base construída', base?.operational_at ? `${base?.name || 'Nova base'} entra em construção` : `${base?.name || 'Nova base'} já integra a rede operacional`, 80);
  }
  if ((next.facilities || []).length > (previous.facilities || []).length) {
    const facility = next.facilities.find(item => !(previous.facilities || []).some(old => old.id === item.id));
    return event('construction', 'positive', facility?.operational_at ? 'Obras iniciadas' : 'Instalação construída', facility?.operational_at ? `${facility?.name || 'Nova instalação'} entra em construção` : `${facility?.name || 'Nova instalação'} está operacional`, 80);
  }
  if (next.units.length > previous.units.length) {
    const unit = next.units.find(item => !previous.units.some(old => old.id === item.id));
    return event('vehicle', 'positive', 'Frota reforçada', `${unit?.name || 'Nova viatura'} pronta para serviço`, 75);
  }
  if (totalPersonnel(next) > totalPersonnel(previous)) {
    const amount = totalPersonnel(next) - totalPersonnel(previous);
    return event('hire', 'positive', 'Pessoal contratado', `${amount} novo${amount === 1 ? ' elemento integrado' : 's elementos integrados'} na rede`, 75);
  }
  if (totalPersonnel(next) < totalPersonnel(previous)) {
    const amount = totalPersonnel(previous) - totalPersonnel(next);
    return event('dismissal', 'negative', 'Pessoal dispensado', `${amount} elemento${amount === 1 ? '' : 's'} removido${amount === 1 ? '' : 's'} da rede`, 75);
  }

  if (action === 'upgrade_base' || action === 'upgrade_facility') {
    return event('upgrade', 'positive', 'Melhoria concluída', 'Capacidade operacional aumentada', 70);
  }
  if (action === 'toggle_extension' && logs.some(item => item.kind === 'success')) {
    return event('upgrade', 'positive', 'Extensão instalada', logs.find(item => item.kind === 'success')?.text || 'Nova capacidade desbloqueada', 70);
  }
  if (action === 'answer') {
    const answered = next.incidents.find(item => item.call_answered && !previous.incidents.find(old => old.id === item.id)?.call_answered);
    if (answered?.call_result?.correct) return event('triage', 'positive', 'Triagem correta', `+${answered.call_result.xp || 25} XP · confiança reforçada`, 70);
    if (answered?.call_result) return event('bad-call', 'negative', 'Orientação corrigida', 'A indicação era insegura · confiança pública reduzida', 70);
  }

  const escalation = logs.find(item => item.text.includes('agravou-se:'));
  if (escalation) return event('escalation', 'warning', 'Situação agravada', escalation.text.replace(' agravou-se:', ':'), 65);

  const repaired = logs.find(item => item.kind === 'success' && item.text.includes('reparada e novamente disponível'));
  if (repaired) return event('vehicle', 'positive', 'Viatura reparada', repaired.text, 65);

  const completedConstruction = logs.find(item => item.kind === 'success' && (item.text.includes('entrou ao serviço') || item.text.includes('concluída em')));
  if (completedConstruction) return event('construction', 'positive', 'Construção concluída', completedConstruction.text, 65);

  const reward = (next.earned || 0) - (previous.earned || 0);
  if (reward > 0) return event('reward', 'positive', 'Recompensa recebida', `+${currency(reward)} adicionados ao orçamento`, 60);

  if ((next.level || 1) > (previous.level || 1)) return event('upgrade', 'positive', `Nível ${next.level} alcançado`, 'Novas capacidades operacionais disponíveis', 60);

  if (action === 'save') return event('success', 'positive', 'Progresso guardado', 'Guardado neste navegador', 35);

  const success = logs.find(item => item.kind === 'success');
  if (success) return event('success', 'positive', 'Objetivo concluído', success.text, 45);

  const alert = logs.find(item => item.kind === 'alert');
  if (alert) return event('alert', 'warning', 'Novo alerta', alert.text, 40);

  return null;
}

export function failureFeedback(message, action = '') {
  const titles = {
    build_base: 'Construção bloqueada',
    build_facility: 'Construção bloqueada',
    buy_vehicle: 'Aquisição recusada',
    recruit_personnel: 'Recrutamento falhou',
    dismiss_personnel: 'Alteração de equipa falhou',
    start_training: 'Formação não iniciada',
    dispatch: 'Despacho falhou',
    dispatch_arr: 'Despacho automático falhou',
  };
  return event('failure', 'negative', titles[action] || 'Ação não concluída', message, 100);
}
