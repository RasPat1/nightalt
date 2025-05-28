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