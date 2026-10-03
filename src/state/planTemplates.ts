/**
 * 内置训练计划模板（v1.1）。
 *
 * 纯数据：名称用 i18n key，交给计划列表按当前语言解析后经 `importPlan` 落成一份
 * 普通计划（之后可自由编辑，模板本身不变）。步频必须在 clampBpm 的 100–250 内，
 * 时长单位为秒。不要在这里引入 React Native / 主题依赖——单测直接以 Node 加载。
 */
import type { I18nKey } from '../i18n/resources';

export interface TemplatePhase {
  name: I18nKey;
  durationSec: number;
  bpm: number;
}

export interface PlanTemplate {
  id: string;
  name: I18nKey;
  desc: I18nKey;
  phases: TemplatePhase[];
}

const min = (m: number) => m * 60;

function intervals(reps: number, fastSec: number, fastBpm: number, easySec: number, easyBpm: number): TemplatePhase[] {
  const out: TemplatePhase[] = [];
  for (let i = 0; i < reps; i++) {
    out.push({ name: 'template.phase.fast', durationSec: fastSec, bpm: fastBpm });
    // 最后一组快跑后直接进冷身，不再插恢复段。
    if (i < reps - 1) out.push({ name: 'template.phase.recover', durationSec: easySec, bpm: easyBpm });
  }
  return out;
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'easy',
    name: 'template.easy.name',
    desc: 'template.easy.desc',
    phases: [
      { name: 'template.phase.warmup', durationSec: min(5), bpm: 165 },
      { name: 'template.phase.easy', durationSec: min(25), bpm: 172 },
      { name: 'template.phase.cooldown', durationSec: min(5), bpm: 160 },
    ],
  },
  {
    id: 'builder',
    name: 'template.builder.name',
    desc: 'template.builder.desc',
    phases: [
      { name: 'template.phase.warmup', durationSec: min(5), bpm: 168 },
      { name: 'template.phase.step', durationSec: min(8), bpm: 172 },
      { name: 'template.phase.step', durationSec: min(8), bpm: 176 },
      { name: 'template.phase.step', durationSec: min(8), bpm: 180 },
      { name: 'template.phase.cooldown', durationSec: min(5), bpm: 165 },
    ],
  },
  {
    id: 'tempo',
    name: 'template.tempo.name',
    desc: 'template.tempo.desc',
    phases: [
      { name: 'template.phase.warmup', durationSec: min(10), bpm: 170 },
      { name: 'template.phase.tempo', durationSec: min(20), bpm: 182 },
      { name: 'template.phase.cooldown', durationSec: min(10), bpm: 166 },
    ],
  },
  {
    id: 'intervals',
    name: 'template.intervals.name',
    desc: 'template.intervals.desc',
    phases: [
      { name: 'template.phase.warmup', durationSec: min(8), bpm: 170 },
      ...intervals(6, min(1), 190, min(2), 172),
      { name: 'template.phase.cooldown', durationSec: min(6), bpm: 165 },
    ],
  },
  {
    id: 'long',
    name: 'template.long.name',
    desc: 'template.long.desc',
    phases: [
      { name: 'template.phase.warmup', durationSec: min(10), bpm: 168 },
      { name: 'template.phase.steady', durationSec: min(50), bpm: 175 },
      { name: 'template.phase.cooldown', durationSec: min(5), bpm: 164 },
    ],
  },
];
