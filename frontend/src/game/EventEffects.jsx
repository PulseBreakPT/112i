import { useEffect } from 'react';
import {
  Award, BadgeCheck, Building2, CarFront, CircleX, Coins, GraduationCap,
  PhoneOff, Radio, Siren, TrendingUp, TriangleAlert, UserMinus, UserPlus, Wrench,
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
    const timer = window.setTimeout(() => onDone?.(event.id), event.tone === 'negative' ? 3200 : 2800);
    return () => window.clearTimeout(timer);
  }, [event, onDone]);

  if (!event) return null;
  const Icon = ICONS[event.variant] || BadgeCheck;
  const assertive = event.tone === 'negative';

  return <div className="event-fx" data-tone={event.tone} data-variant={event.variant} aria-live={assertive ? 'assertive' : 'polite'} aria-atomic="true">
    <div className="event-fx-vignette" />
    <div className="event-fx-signature" aria-hidden="true"><i /><i /><i /><i /></div>
    <div className="event-fx-particles" aria-hidden="true">{Array.from({ length: 14 }, (_, index) => <i key={index} style={{ '--i': index }} />)}</div>
    <section className="event-fx-card" role="status" data-testid={`event-effect-${event.variant}`}>
      <div className="event-fx-kicker">{event.tone === 'positive' ? 'RESULTADO OPERACIONAL' : event.tone === 'warning' ? 'ATUALIZAÇÃO CRÍTICA' : 'ALERTA OPERACIONAL'}</div>
      <div className="event-fx-icon"><Icon size={34} strokeWidth={1.7} /></div>
      <h2>{event.title}</h2>
      <p>{event.detail}</p>
      <div className="event-fx-timer"><i /></div>
    </section>
  </div>;
}
