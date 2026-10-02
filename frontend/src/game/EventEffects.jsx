import { useEffect } from 'react';
import {
  Award, BadgeCheck, Building2, CarFront, CircleX, Coins, GraduationCap,
  PhoneOff, Radio, Siren, TrendingUp, TriangleAlert, UserMinus, UserPlus, Wrench, X,
} from 'lucide-react';
import './EventEffects.css';

const ICONS = {
  mission: Award,
  reward: Coins,
  construction: Building2,
  training: GraduationCap,
  hire: UserPlus,
  dismissal: UserMinus,
  vehicle: CarFront,
  upgrade: TrendingUp,
  triage: BadgeCheck,
  'mission-failed': CircleX,
  'bad-call': PhoneOff,
  breakdown: Wrench,
  escalation: Siren,
  alert: Radio,
  success: BadgeCheck,
  failure: TriangleAlert,
};

export default function EventEffects({ event, onDone }) {
  useEffect(() => {
    if (!event) return undefined;
    const timer = window.setTimeout(() => onDone?.(event.id), event.tone === 'negative' ? 3800 : 3200);
    return () => window.clearTimeout(timer);
  }, [event, onDone]);

  if (!event) return null;
  const Icon = ICONS[event.variant] || BadgeCheck;
  const assertive = event.tone === 'negative';

  return <div className="event-fx" data-tone={event.tone} data-variant={event.variant} aria-live={assertive ? 'assertive' : 'polite'} aria-atomic="true">
    <section className="event-fx-card" role="status" data-testid={`event-effect-${event.variant}`}>
      <div className="event-fx-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.8} /></div>
      <div className="event-fx-copy"><div className="event-fx-kicker">{event.tone === 'positive' ? 'RESULTADO' : event.tone === 'warning' ? 'ATUALIZAÇÃO' : 'ALERTA'}</div><h2>{event.title}</h2><p>{event.detail}</p></div>
      <button className="event-fx-close" type="button" aria-label="Fechar notificação" onClick={() => onDone?.(event.id)}><X size={17} /></button>
      <div className="event-fx-timer"><i /></div>
    </section>
  </div>;
}
