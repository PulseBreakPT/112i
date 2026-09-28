// Original, procedural soundscape. No recordings, network requests, speech, or external services.
let context;
let master;
let sources = [];
let unlocked = false;
let enabled = true;
let active = false;

function loopBuffer(buffer, gainValue, filterType, frequency) {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  source.loop = true;
  filter.type = filterType;
  filter.frequency.value = frequency;
  filter.Q.value = .5;
  gain.gain.value = gainValue;
  source.connect(filter).connect(gain).connect(master);
  source.start();
  sources.push(source);
  return gain;
}

function createSoundscape() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  context = new Audio();
  master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);
  const sampleRate = 22050;
  const noise = context.createBuffer(1, sampleRate * 12, sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  const traffic = loopBuffer(noise, .095, 'lowpass', 280);
  const passing = context.createOscillator();
  const modulation = context.createGain();
  passing.frequency.value = .055;
  modulation.gain.value = .035;
  passing.connect(modulation).connect(traffic.gain);
  passing.start();
  sources.push(passing);
  loopBuffer(noise, .018, 'bandpass', 1800);

  // Distant, softly tuned radio phrases with a little band-limited static; deliberately no voices.
  const radio = context.createBuffer(1, sampleRate * 32, sampleRate);
  const channel = radio.getChannelData(0);
  const notes = [220, 261.63, 329.63, 293.66, 246.94, 196, 261.63, 220];
  for (let i = 0; i < channel.length; i++) {
    const t = i / sampleRate;
    const phrase = t >= 4 && t < 12 ? t - 4 : t >= 23 && t < 29 ? t - 23 : -1;
    if (phrase < 0) continue;
    const fade = Math.min(1, phrase / .8) * Math.min(1, (t < 12 ? 12 - t : 29 - t) / 1.2);
    const note = notes[Math.floor(phrase * 2) % notes.length];
    const envelope = Math.sin(Math.PI * ((phrase * 2) % 1)) ** 2;
    channel[i] = fade * (.12 * envelope * (Math.sin(2 * Math.PI * note * t) + .3 * Math.sin(4 * Math.PI * note * t)) + .018 * (Math.random() * 2 - 1));
  }
  loopBuffer(radio, .24, 'bandpass', 650);
}

function sync() {
  if (!context) return;
  const shouldPlay = unlocked && enabled && active && !document.hidden;
  master.gain.cancelScheduledValues(context.currentTime);
  master.gain.setTargetAtTime(shouldPlay ? .55 : 0, context.currentTime, .15);
  if (shouldPlay) {
    if (context.state !== 'running') context.resume().catch(() => {});
  } else if (context.state === 'running') {
    context.suspend().catch(() => {});
  }
}

export const ambientAudio = {
  unlock() {
    unlocked = true;
    if (enabled && !context) {
      try { createSoundscape(); } catch (_) { this.dispose(); }
    }
    sync();
  },
  configure(sound, running) { enabled = sound; active = running; sync(); },
  beep(frequency = 660) {
    if (!context || !unlocked || !enabled || document.hidden || context.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.065, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .2);
    oscillator.connect(gain).connect(master);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start();
    oscillator.stop(context.currentTime + .2);
  },
  dispose() {
    sources.forEach(source => { try { source.stop(); source.disconnect(); } catch (_) { /* A stopped source needs no further cleanup. */ } });
    sources = [];
    if (context) context.close().catch(() => {});
    context = undefined;
    master = undefined;
    unlocked = false;
  },
};
