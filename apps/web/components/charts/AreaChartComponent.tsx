'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer, CHART_COLORS, customTooltipStyle } from './Primitives';

interface AreaChartComponentProps {
  data: any[];
  xKey: string;
  areas: {
    dataKey: string;
    name: string;
    color?: string;
    stackId?: string;
  }[];
  height?: number;
  title?: string;
  description?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export function AreaChartComponent({
  data,
  xKey,
  areas,
  height = 300,
  title,
  description,
  showGrid = true,
  showLegend = true,
  xAxisLabel,
  yAxisLabel,
}: AreaChartComponentProps) {
  const axisFontSize = 13;
  return (
    <ChartContainer height={height} title={title} description={description}>
      <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
        {areas.map((area, index) => (
          <Area
            key={area.dataKey}
            type="monotone"
            dataKey={area.dataKey}
            name={area.name}
            stroke={area.color || CHART_COLORS.palette[index % CHART_COLORS.palette.length]}
            fill={area.color || CHART_COLORS.palette[index % CHART_COLORS.palette.length]}
            fillOpacity={0.6}
            stackId={area.stackId}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
