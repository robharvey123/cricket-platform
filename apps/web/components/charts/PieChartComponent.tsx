'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, CHART_COLORS, customTooltipStyle } from './Primitives';

interface PieChartComponentProps {
  data: any[];
  nameKey: string;
  valueKey: string;
  height?: number;
  title?: string;
  description?: string;
  showLegend?: boolean;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  showLabels?: boolean;
}

export function PieChartComponent({
  data,
  nameKey,
  valueKey,
  height = 300,
  title,
  description,
  showLegend = true,
  colors = CHART_COLORS.palette,
  innerRadius = 0,
  outerRadius = 80,
  showLabels = true,
}: PieChartComponentProps) {
  const renderLabel = (entry: any) => {
    const percent = ((entry.value / entry.payload.total) * 100).toFixed(1);
    return `${entry[nameKey]}: ${percent}%`;
  };

  // Calculate total for percentage
  const total = data.reduce((sum, item) => sum + item[valueKey], 0);
  const dataWithTotal = data.map((item) => ({ ...item, total }));

  return (
    <ChartContainer height={height} title={title} description={description}>
      <PieChart>
        <Pie
          data={dataWithTotal}
          cx="50%"
          cy="50%"
          labelLine={showLabels}
          label={showLabels ? renderLabel : false}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey={valueKey}
          nameKey={nameKey}
        >
          {dataWithTotal.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={customTooltipStyle}
          formatter={(value: number | undefined) => value?.toString() || ''}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value, entry: any) => {
              const percent = ((entry.payload[valueKey] / total) * 100).toFixed(1);
              return `${value} (${percent}%)`;
            }}
          />
        )}
      </PieChart>
    </ChartContainer>
  );
}
