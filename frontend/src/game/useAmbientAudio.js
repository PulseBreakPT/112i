import { useEffect } from 'react';
import { ambientAudio } from './ambientAudio';

export function useAmbientAudio(enabled, active) {
  useEffect(() => {
    ambientAudio.configure(enabled, active);
  }, [enabled, active]);
  useEffect(() => {
    const unlock = event => {
      if (event.isTrusted && !event.repeat) ambientAudio.unlock();
    };
    const visibility = () => ambientAudio.configure(enabled, active);
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [enabled, active]);
  useEffect(() => () => ambientAudio.dispose(), []);
}
