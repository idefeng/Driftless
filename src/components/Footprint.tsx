import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

/**
 * Footprint — Driftless 的品牌图形：一只脚印（脚掌 + 足弓 + 四趾）。
 * 几何定义在 40×64 的局部坐标里（右脚：大脚趾在内侧/左侧），左脚为镜像。
 * Logo、首页节拍脚印、App 图标（assets/driftless-logo.svg）共用同一套几何。
 */

export const FOOT_W = 40;
export const FOOT_H = 64;

export const FOOT_SOLE =
  'M18 15 C27 14 33 19 33.5 27 C34 34 31 40 29.5 46 C28 52 29 58 24.5 62 ' +
  'C20 65.5 13 64 12 57.5 C11.2 52 14.5 47 14 41 C13.6 36 8.5 33 8.5 26 C8.5 19 12 15.3 18 15 Z';

export const FOOT_TOES: [number, number, number][] = [
  [12.6, 8.4, 4.4],
  [20.6, 5.8, 3.1],
  [26.7, 7.6, 2.7],
  [31.5, 11.4, 2.3],
];

/** Raw footprint shapes for composing inside an existing <Svg>. */
export function FootShape({
  side,
  color,
  opacity = 1,
  transform,
}: {
  side: 'left' | 'right';
  color: string;
  opacity?: number;
  transform?: string;
}) {
  const mirror = side === 'left' ? ` translate(${FOOT_W} 0) scale(-1 1)` : '';
  return (
    <G transform={`${transform ?? ''}${mirror}`} fill={color} fillOpacity={opacity}>
      <Path d={FOOT_SOLE} />
      {FOOT_TOES.map(([cx, cy, r], i) => (
        <Circle key={i} cx={cx} cy={cy} r={r} />
      ))}
    </G>
  );
}

/** A single standalone footprint, `height` px tall. */
export function Footprint({
  side,
  color,
  height = 64,
  opacity = 1,
}: {
  side: 'left' | 'right';
  color: string;
  height?: number;
  opacity?: number;
}) {
  return (
    <Svg width={(height * FOOT_W) / FOOT_H} height={height} viewBox={`0 0 ${FOOT_W} ${FOOT_H}`}>
      <FootShape side={side} color={color} opacity={opacity} />
    </Svg>
  );
}

/**
 * The logo mark: trailing left foot low-left (dimmed), leading right foot
 * high-right — a step in progress. Drawn in a 100×100 box, `size` px square.
 */
export function FootprintPair({
  size = 24,
  lead,
  trail,
  trailOpacity = 0.45,
}: {
  size?: number;
  lead: string;
  trail?: string;
  trailOpacity?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="11 4 78 92">
      <FootShape side="left" color={trail ?? lead} opacity={trailOpacity} transform="translate(13 28) rotate(-9 20 32)" />
      <FootShape side="right" color={lead} transform="translate(47 6) rotate(9 20 32)" />
    </Svg>
  );
}
