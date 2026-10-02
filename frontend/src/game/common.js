import { Flame, HeartPulse, Shield } from 'lucide-react';
import { ambientAudio } from './ambientAudio';
import { portugalTime } from './engines/timeEngine';
export const SERVICE = {
  fire: { ink: 'var(--service-fire)', name: 'Bombeiros', short: 'BOMBEIROS', color: '#f58080', icon: Flame },
  medical: { ink: 'var(--service-medical)', name: 'INEM', short: 'INEM', color: '#f0c75e', icon: HeartPulse },
  police: { ink: 'var(--service-police)', name: 'PSP', short: 'PSP', color: '#82adf4', icon: Shield },
};
export const money = n => new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 }).format(n) + ' €';
export const clock = value => portugalTime(value);
export const duration = n => `${Math.floor(Math.max(0, n) / 60).toString().padStart(2, '0')}:${Math.floor(Math.max(0, n) % 60).toString().padStart(2, '0')}`;
export const STATUS = { waiting: 'A aguardar mobilização', enroute: 'Em deslocação', onscene: 'No local', available: 'Disponível', patrol: 'Em patrulha', staged: 'Em concentração', staging_enroute: 'Para concentração', transporting: 'Em transporte', returning: 'Em regresso', base_transfer: 'Em transferência de base', broken: 'Avariada', maintenance: 'Em manutenção', resting: 'Equipa em descanso', offshift: 'Fora de turno', uncrewed: 'Sem equipa' };
export const ServiceIcon = ({ service, size = 18, ...props }) => { const Icon = SERVICE[service]?.icon || Shield; return <Icon size={size} {...props} />; };
export function beep(enabled, frequency = 660) { if (enabled) ambientAudio.beep(frequency); }
