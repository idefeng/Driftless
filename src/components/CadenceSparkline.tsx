import React from 'react';
import Svg, { Polyline } from 'react-native-svg';
import type { SessionPoint } from '../state/sessionStats';

/**
 * 目标（虚线、弱色）与实测（品牌色）步频曲线；纵轴按两者共同范围自适应。
 * 训练记录卡片与分享卡片共用。
 */
export function CadenceSparkline({
  series,
  width,
  height,
  targetColor,
  spmColor,
  strokeScale = 1,
}: {
  series: SessionPoint[];
  width: number;
  height: number;
  targetColor: string;
  spmColor: string;
  strokeScale?: number;
}) {
  if (series.length < 2) return null;
  const values = series.flatMap((p) => (p.spm == null ? [p.target] : [p.target, p.spm]));
  const lo = Math.min(...values) - 3;
  const hi = Math.max(...values) + 3;
  // 留出半个线宽，避免曲线贴边被裁掉。
  const pad = 2 * strokeScale;
  const x = (i: number) => (i / (series.length - 1)) * width;
  const y = (v: number) => pad + (height - 2 * pad) * (1 - (v - lo) / (hi - lo));
  const target = series.map((p, i) => `${x(i).toFixed(1)},${y(p.target).toFixed(1)}`).join(' ');
  // 实测曲线遇到没有读数的点会断开，分段绘制。
  const spmSegments: string[] = [];
  let current: string[] = [];
  series.forEach((p, i) => {
    if (p.spm == null) {
      if (current.length > 1) spmSegments.push(current.join(' '));
      current = [];
    } else {
      current.push(`${x(i).toFixed(1)},${y(p.spm).toFixed(1)}`);
    }
  });
  if (current.length > 1) spmSegments.push(current.join(' '));

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={target}
        fill="none"
        stroke={targetColor}
        strokeWidth={1.5 * strokeScale}
        strokeDasharray={`${3 * strokeScale} ${3 * strokeScale}`}
      />
      {spmSegments.map((pts, i) => (
        <Polyline
          key={i}
          points={pts}
          fill="none"
          stroke={spmColor}
          strokeWidth={2 * strokeScale}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}
