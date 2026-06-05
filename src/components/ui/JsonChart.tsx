"use client";

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ChartData {
  type: 'line' | 'bar' | 'pie';
  title?: string;
  data: any[];
  xAxisKey?: string;
  series: {
    key: string;
    name?: string;
    color?: string;
  }[];
}

interface JsonChartProps {
  data: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const JsonChart: React.FC<JsonChartProps> = ({ data }) => {
  const parsedData = useMemo<ChartData | null>(() => {
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }, [data]);

  if (!parsedData || !parsedData.type || !Array.isArray(parsedData.data)) {
    return (
      <div className="my-8 w-full bg-card border border-border rounded-xl shadow-sm overflow-hidden p-6">
        <div className="flex items-center space-x-2 text-destructive mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <h4 className="font-semibold text-sm">Chart Data Error</h4>
        </div>
        <pre className="text-xs font-mono text-foreground bg-muted/50 p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
          {data}
        </pre>
      </div>
    );
  }

  const { type, title, data: chartData, xAxisKey = 'name', series } = parsedData;

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey={xAxisKey} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {series.map((s, idx) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name || s.key}
                stroke={s.color || COLORS[idx % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey={xAxisKey} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
              cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.4 }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {series.map((s, idx) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name || s.key}
                fill={s.color || COLORS[idx % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'pie':
        // For pie chart, usually only the first series matters.
        const pieDataKey = series[0]?.key || 'value';
        return (
          <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Pie
              data={chartData}
              dataKey={pieDataKey}
              nameKey={xAxisKey}
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="my-12 w-full border border-border rounded-xl shadow-sm bg-card/40 overflow-hidden">
      {title && (
        <div className="px-6 py-4 border-b border-border bg-card/60">
          <h4 className="font-semibold text-sm text-foreground/90">{title}</h4>
        </div>
      )}
      <div className="p-4" style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart() as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
