'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer, CHART_COLORS, customTooltipStyle } from './Primitives';

interface LineChartComponentProps {
  data: any[];
  xKey: string;
  lines: {
    dataKey: string;
    name: string;
    color?: string;
    strokeWidth?: number;
  }[];
  height?: number;
  title?: string;
  description?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export function LineChartComponent({
  data,
  xKey,
  lines,
  height = 300,
  title,
  description,
  showGrid = true,
  showLegend = true,
  xAxisLabel,
  yAxisLabel,
}: LineChartComponentProps) {
  const axisFontSize = 13;
  return (
    <ChartContainer height={height} title={title} description={description}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
        <XAxis
          dataKey={xKey}
          stroke="#6b7280"
          fontSize={axisFontSize}
          tickMargin={8}
          minTickGap={12}
          label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
        />
        <YAxis
          stroke="#6b7280"
          fontSize={axisFontSize}
          tickMargin={8}
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
        />
        <Tooltip
          contentStyle={customTooltipStyle}
          labelStyle={{ fontWeight: 600, marginBottom: 4 }}
        />
        {showLegend && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color || CHART_COLORS.palette[index % CHART_COLORS.palette.length]}
            strokeWidth={line.strokeWidth || 2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
