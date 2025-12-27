'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer, CHART_COLORS, customTooltipStyle } from './Primitives';

interface BarChartComponentProps {
  data: any[];
  xKey: string;
  bars: {
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
  layout?: 'horizontal' | 'vertical';
}

export function BarChartComponent({
  data,
  xKey,
  bars,
  height = 300,
  title,
  description,
  showGrid = true,
  showLegend = true,
  xAxisLabel,
  yAxisLabel,
  layout = 'horizontal',
}: BarChartComponentProps) {
  const axisFontSize = 13;
  return (
    <ChartContainer height={height} title={title} description={description}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
        {layout === 'horizontal' ? (
          <>
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
          </>
        ) : (
          <>
            <XAxis
              type="number"
              stroke="#6b7280"
              fontSize={axisFontSize}
              tickMargin={8}
              minTickGap={12}
              label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
            />
            <YAxis
              type="category"
              dataKey={xKey}
              stroke="#6b7280"
              fontSize={axisFontSize}
              tickMargin={8}
              width={140}
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
            />
          </>
        )}
        <Tooltip
          contentStyle={customTooltipStyle}
          labelStyle={{ fontWeight: 600, marginBottom: 4 }}
        />
        {showLegend && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
        {bars.map((bar, index) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color || CHART_COLORS.palette[index % CHART_COLORS.palette.length]}
            stackId={bar.stackId}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
