'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Moon, Sun, Pill, Clock } from 'lucide-react';

interface Event {
  id: string;
  timestamp: string;
  type: string;
  category: string;
  name: string;
  value?: number;
  unit?: string;
}

const iconMap: Record<string, any> = {
  sleep_start: Moon,
  sleep_end: Sun,
  supplement: Pill,
};

const categoryColors: Record<string, string> = {
  sleep: 'bg-blue-100 text-blue-800',
  intervention: 'bg-green-100 text-green-800',
};

export function Timeline() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  const groupedEvents = events.reduce((acc, event) => {
    const date = format(new Date(event.timestamp), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  return (
    <div className="space-y-8">
      {Object.entries(groupedEvents)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, dayEvents]) => (
          <div key={date}>
            <h3 className="text-lg font-semibold mb-4">
              {format(new Date(date), 'EEEE, MMMM d')}
            </h3>
            <div className="space-y-4">
              {dayEvents
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map(event => {
                  const Icon = iconMap[event.type] || Clock;
                  return (
                    <div key={event.id} className="flex items-start gap-4">
                      <div className={`p-2 rounded-full ${categoryColors[event.category]}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between">
                          <h4 className="font-medium">{event.name}</h4>
                          <time className="text-sm text-gray-500">
                            {format(new Date(event.timestamp), 'h:mm a')}
                          </time>
                        </div>
                        {event.value && (
                          <p className="text-sm text-gray-600">
                            {event.type === 'sleep_end' 
                              ? `Duration: ${Math.round(event.value / 60)} hours ${Math.round(event.value % 60)} minutes`
                              : `${event.value} ${event.unit}`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
    </div>
  );
}