'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { ChartContainer, CHART_COLORS, customTooltipStyle } from './Primitives';

interface ScatterChartComponentProps {
  data: any[];
  xKey: string;
  yKey: string;
  zKey?: string;
  nameKey?: string;
  height?: number;
  title?: string;
  description?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  color?: string;
  shape?: 'circle' | 'cross' | 'diamond' | 'square' | 'star' | 'triangle' | 'wye';
}

export function ScatterChartComponent({
  data,
  xKey,
  yKey,
  zKey,
  nameKey,
  height = 300,
  title,
  description,
  showGrid = true,
  showLegend = false,
  xAxisLabel,
  yAxisLabel,
  color = CHART_COLORS.primary,
  shape = 'circle',
}: ScatterChartComponentProps) {
  const axisFontSize = 13;
  return (
    <ChartContainer height={height} title={title} description={description}>
      <ScatterChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
        <XAxis
          type="number"
          dataKey={xKey}
          name={xAxisLabel || xKey}
          stroke="#6b7280"
          fontSize={axisFontSize}
          tickMargin={8}
          minTickGap={12}
          label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
        />
        <YAxis
          type="number"
          dataKey={yKey}
          name={yAxisLabel || yKey}
          stroke="#6b7280"
          fontSize={axisFontSize}
          tickMargin={8}
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
        />
        {zKey && <ZAxis type="number" dataKey={zKey} range={[60, 400]} name={zKey} />}
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={customTooltipStyle}
          formatter={(value: any, name?: string) => {
            if (name === xKey) return `${xAxisLabel || xKey}: ${value}`;
            if (name === yKey) return `${yAxisLabel || yKey}: ${value}`;
            return `${name || ''}: ${value}`;
          }}
          labelFormatter={(label) => (nameKey ? `${nameKey}: ${label}` : label)}
        />
        {showLegend && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
        <Scatter
          name={title || 'Data'}
          data={data}
          fill={color}
          shape={shape}
          fillOpacity={0.6}
        />
      </ScatterChart>
    </ChartContainer>
  );
}
