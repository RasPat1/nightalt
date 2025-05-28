'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, differenceInMinutes } from 'date-fns';

interface SleepData {
  date: string;
  duration: number;
  hours: number;
}

export function SleepChart() {
  const [data, setData] = useState<SleepData[]>([]);

  useEffect(() => {
    fetch('/api/events')
      .then(res => res.json())
      .then(events => {
        // Process events to calculate sleep duration
        const sleepSessions: Record<string, { start?: Date; end?: Date }> = {};
        
        events.forEach((event: any) => {
          const date = format(parseISO(event.timestamp), 'yyyy-MM-dd');
          
          if (event.type === 'sleep_start') {
            if (!sleepSessions[date]) sleepSessions[date] = {};
            sleepSessions[date].start = parseISO(event.timestamp);
          } else if (event.type === 'sleep_end') {
            if (!sleepSessions[date]) sleepSessions[date] = {};
            sleepSessions[date].end = parseISO(event.timestamp);
          }
        });

        const chartData = Object.entries(sleepSessions)
          .filter(([_, session]) => session.start && session.end)
          .map(([date, session]) => {
            const duration = differenceInMinutes(session.end!, session.start!);
            return {
              date: format(parseISO(date), 'MMM d'),
              duration,
              hours: Math.round(duration / 60 * 10) / 10,
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-7); // Last 7 days

        setData(chartData);
      });
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Sleep Duration (Last 7 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis 
            label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
            domain={[0, 12]}
          />
          <Tooltip 
            formatter={(value: number) => `${value} hours`}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Bar dataKey="hours" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
      
      <div className="mt-4 text-sm text-gray-600">
        Average: {data.length > 0 
          ? (data.reduce((sum, d) => sum + d.hours, 0) / data.length).toFixed(1)
          : '0'} hours
      </div>
    </div>
  );
}