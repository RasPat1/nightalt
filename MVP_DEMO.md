# NightCtrl MVP Demo - Rapid Implementation Guide

## Objective
Create a minimal viable version of NightCtrl that demonstrates core functionality in a few hours. Focus only on essential features that showcase the sleep timeline concept.

## MVP Feature Set
1. **Timeline View** - Display sleep events and interventions
2. **Manual Data Entry** - Add sleep sessions and supplements
3. **Basic Visualization** - Simple sleep duration chart
4. **Derived Metrics** - Calculate sleep duration and efficiency

## Tech Stack (Simplified)
- **Next.js 14** - Single app for frontend + API
- **SQLite + Prisma** - Simple database (no PostgreSQL needed)
- **Tailwind CSS** - Quick styling
- **React State** - No complex state management
- **Recharts** - Basic charts

## Implementation Order

### Step 1: Initialize Project

```bash
# Create Next.js app with TypeScript and Tailwind
npx create-next-app@latest nightctrl-mvp --typescript --tailwind --app --use-pnpm
cd nightctrl-mvp

# Install essential dependencies
pnpm add @prisma/client prisma date-fns recharts lucide-react
pnpm add -D @types/node
```

### Step 2: Set Up Database

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
  events    Event[]
}

model Event {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  timestamp DateTime
  type      String   // sleep_start, sleep_end, supplement, etc.
  category  String   // sleep, intervention
  name      String
  value     Float?
  unit      String?
  notes     String?
  createdAt DateTime @default(now())
}
```

Initialize database:

```bash
npx prisma generate
npx prisma db push
```

### Step 3: Create Seed Data

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { subDays, setHours, addHours } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@nightctrl.com' },
    update: {},
    create: {
      email: 'demo@nightctrl.com',
      name: 'Demo User',
    },
  });

  // Generate last 7 days of sleep data
  for (let i = 0; i < 7; i++) {
    const date = subDays(new Date(), i);
    const bedtime = setHours(date, 22 + Math.random() * 2);
    const waketime = addHours(bedtime, 6 + Math.random() * 3);

    // Sleep start
    await prisma.event.create({
      data: {
        userId: user.id,
        timestamp: bedtime,
        type: 'sleep_start',
        category: 'sleep',
        name: 'Bedtime',
      },
    });

    // Sleep end
    await prisma.event.create({
      data: {
        userId: user.id,
        timestamp: waketime,
        type: 'sleep_end',
        category: 'sleep',
        name: 'Wake Time',
        value: (waketime.getTime() - bedtime.getTime()) / (1000 * 60), // duration in minutes
        unit: 'minutes',
      },
    });

    // Random supplement
    if (Math.random() > 0.5) {
      await prisma.event.create({
        data: {
          userId: user.id,
          timestamp: addHours(bedtime, -1),
          type: 'supplement',
          category: 'intervention',
          name: 'Magnesium',
          value: 400,
          unit: 'mg',
        },
      });
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Add to `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

Run seed: `pnpm prisma db seed`

### Step 4: Create API Routes

Create `app/api/events/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  
  const events = await prisma.event.findMany({
    where: {
      userId: 'demo-user-id', // Hardcoded for MVP
      timestamp: {
        gte: start ? new Date(start) : undefined,
        lte: end ? new Date(end) : undefined,
      },
    },
    orderBy: { timestamp: 'desc' },
  });

  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const event = await prisma.event.create({
    data: {
      ...body,
      userId: 'demo-user-id', // Hardcoded for MVP
      timestamp: new Date(body.timestamp),
    },
  });

  return NextResponse.json(event);
}
```

### Step 5: Create Timeline Component

Create `components/Timeline.tsx`:

```typescript
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

const iconMap = {
  sleep_start: Moon,
  sleep_end: Sun,
  supplement: Pill,
};

const categoryColors = {
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
```

### Step 6: Create Add Event Form

Create `components/AddEventForm.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { format } from 'date-fns';

export function AddEventForm({ onEventAdded }: { onEventAdded: () => void }) {
  const [type, setType] = useState('sleep_start');
  const [timestamp, setTimestamp] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const eventTypes = [
    { value: 'sleep_start', label: 'Bedtime', category: 'sleep' },
    { value: 'sleep_end', label: 'Wake Time', category: 'sleep' },
    { value: 'supplement', label: 'Supplement', category: 'intervention' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const selectedType = eventTypes.find(t => t.value === type);
    
    const eventData = {
      timestamp,
      type,
      category: selectedType?.category,
      name: selectedType?.label,
      ...(type === 'supplement' && {
        value: parseFloat(value),
        unit: 'mg',
      }),
    };

    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    setSubmitting(false);
    onEventAdded();
    
    // Reset form
    setTimestamp(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Add Event</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full p-2 border rounded"
          >
            {eventTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Time</label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {type === 'supplement' && (
          <div>
            <label className="block text-sm font-medium mb-1">Amount (mg)</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="400"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Adding...' : 'Add Event'}
        </button>
      </div>
    </form>
  );
}
```

### Step 7: Create Sleep Chart

Create `components/SleepChart.tsx`:

```typescript
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
```

### Step 8: Create Main Dashboard

Create `app/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Timeline } from '@/components/Timeline';
import { AddEventForm } from '@/components/AddEventForm';
import { SleepChart } from '@/components/SleepChart';

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEventAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">NightCtrl MVP</h1>
          <p className="text-gray-600">Sleep Timeline Demo</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Add Event Form */}
          <div className="lg:col-span-1">
            <AddEventForm onEventAdded={handleEventAdded} />
          </div>

          {/* Middle column - Timeline */}
          <div className="lg:col-span-2 space-y-8">
            <SleepChart key={`chart-${refreshKey}`} />
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Timeline</h2>
              <Timeline key={`timeline-${refreshKey}`} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

### Step 9: Update Layout

Update `app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NightCtrl MVP",
  description: "Sleep Timeline Demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

### Step 10: Quick Fixes and Run

1. Update `next.config.js` if needed:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
}

module.exports = nextConfig
```

2. Create demo user in database:
```bash
# Update the seed script to use a fixed ID
# In prisma/seed.ts, change the user creation to:
const user = await prisma.user.upsert({
  where: { id: 'demo-user-id' },
  update: {},
  create: {
    id: 'demo-user-id',
    email: 'demo@nightctrl.com',
    name: 'Demo User',
  },
});
```

3. Run the app:
```bash
pnpm prisma db push
pnpm prisma db seed
pnpm dev
```

## Demo Flow

1. **Show Timeline**: Display the last 7 days of sleep data
2. **Add Manual Entry**: Add a bedtime and wake time for today
3. **Show Sleep Chart**: Demonstrate the sleep duration visualization
4. **Add Intervention**: Add a supplement and show how it appears on timeline
5. **Explain Vision**: "This MVP shows manual entry, but the full system will automatically sync from 20+ sources including wearables, apps, and medical devices"

## What This MVP Demonstrates

- ✅ Unified timeline of sleep events
- ✅ Manual data entry (foundation for all integrations)
- ✅ Basic visualization
- ✅ Event categorization (sleep vs interventions)
- ✅ Simple derived metrics (sleep duration)

## What's Missing (But Can Be Explained)

- Multiple data source integration
- Automatic sync from wearables
- Advanced analytics and correlations
- User authentication
- Complex derived metrics
- ML recommendations
- Mobile app

## Total Time: ~2-3 hours

This MVP is sufficient to demonstrate the core concept of NightCtrl while being simple enough to build quickly for a demo today.