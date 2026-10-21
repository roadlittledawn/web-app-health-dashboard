'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Box, Typography } from '@mui/material';
import { formatLocalDate } from '@/lib/dateUtils';

interface PainLevelEntry {
  date: Date;
  intensity: number;
}

interface PainLevelChartProps {
  data: PainLevelEntry[];
}

export default function PainLevelChart({ data }: PainLevelChartProps) {
  if (!data || data.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="text.secondary">No pain level data to display</Typography>
      </Box>
    );
  }

  const chartData = data
    .map(entry => ({
      date: formatLocalDate(entry.date),
      intensity: entry.intensity,
      fullDate: new Date(entry.date).toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <Box height={300}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="fullDate" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            domain={[0, 10]} 
            tick={{ fontSize: 12 }}
            label={{ value: 'Pain Level', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            labelFormatter={(label) => `Date: ${label}`}
            formatter={(value) => [`${value}/10`, 'Pain Level']}
          />
          <Line 
            type="monotone" 
            dataKey="intensity" 
            stroke="#2563eb" 
            strokeWidth={2}
            dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
