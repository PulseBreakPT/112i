import { Flame, HeartPulse, Shield } from 'lucide-react';
export const SERVICE = {
  fire: { name: 'Bombeiros', short: 'BOMBEIROS', color: '#f17465', icon: Flame },
  medical: { name: 'Emergência médica', short: 'INEM', color: '#efbd58', icon: HeartPulse },
  police: { name: 'Polícia', short: 'PSP', color: '#739cf3', icon: Shield },
};
export const money = n => new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 }).format(n) + ' €';
export const clock = elapsed => { const total = 14 * 3600 + 32 * 60 + Math.floor(elapsed); return [Math.floor(total / 3600) % 24, Math.floor(total / 60) % 60, total % 60].map(n => String(n).padStart(2, '0')).join(':'); };
export const duration = n => `${Math.floor(Math.max(0, n) / 60).toString().padStart(2, '0')}:${Math.floor(Math.max(0, n) % 60).toString().padStart(2, '0')}`;
export const STATUS = { waiting: 'Aguarda despacho', enroute: 'A caminho', onscene: 'No local', available: 'Disponível', returning: 'A regressar' };
export const ServiceIcon = ({ service, size = 18, ...props }) => { const Icon = SERVICE[service]?.icon || Shield; return <Icon size={size} {...props} />; };
let audio;
export function beep(enabled, frequency = 660) { if (!enabled) return; try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); const o = audio.createOscillator(), gain = audio.createGain(); o.connect(gain); gain.connect(audio.destination); o.frequency.value = frequency; gain.gain.setValueAtTime(.045, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .2); o.start(); o.stop(audio.currentTime + .2); } catch (_) {} }