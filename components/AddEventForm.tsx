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