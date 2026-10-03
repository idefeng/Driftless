import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { QRCodeGenerator } from '../utils/qrcode';

interface PlanQRCodeProps {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export function PlanQRCode({
  value,
  size = 200,
  color = '#211C16',
  backgroundColor = '#FFFFFF',
}: PlanQRCodeProps) {
  const matrix = useMemo(() => QRCodeGenerator.generateMatrix(value), [value]);
  const numModules = matrix.length;
  const cellSize = size / numModules;

  return (
    <View style={[styles.container, { width: size, height: size, backgroundColor }]}>
      <Svg width={size} height={size}>
        <Rect width={size} height={size} fill={backgroundColor} />
        {matrix.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <Rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize + 0.3} // small overlap to prevent pixel gaps
                height={cellSize + 0.3}
                fill={color}
              />
            ) : null
          )
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
