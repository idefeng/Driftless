import type { SoundId } from '../state/CadenceContext';
import type { I18nKey, Translator } from './resources';

const SOUND_NAME_KEYS: Record<SoundId, I18nKey> = {
  beep: 'sound.beep.name',
  woodfish: 'sound.woodfish.name',
  click: 'sound.click.name',
};

const SOUND_DESC_KEYS: Record<SoundId, I18nKey> = {
  beep: 'sound.beep.desc',
  woodfish: 'sound.woodfish.desc',
  click: 'sound.click.desc',
};

const SOUND_SHORT_KEYS: Record<SoundId, I18nKey> = {
  beep: 'sound.beep.short',
  woodfish: 'sound.woodfish.short',
  click: 'sound.click.short',
};

export function getSoundName(t: Translator, id: SoundId): string {
  return t(SOUND_NAME_KEYS[id]);
}

export function getSoundDesc(t: Translator, id: SoundId): string {
  return t(SOUND_DESC_KEYS[id]);
}

export function getSoundShortName(t: Translator, id: SoundId): string {
  return t(SOUND_SHORT_KEYS[id]);
}
