"use client";

import React, { useMemo } from 'react';
import { useChat } from '@/context/ChatProvider';
import { QueryStatus } from '@/context/types';

// --- StatusIndicator Component (Updated) ---
const StatusIndicator = ({ label, isActive }: { label: QueryStatus; isActive: boolean; }) => {
  const inactiveStyles = 'bg-gray-100 border-gray-400 text-black';
  let activeStyles = '';

  switch (label) {
    case 'IDLE':
      activeStyles = 'bg-lime-500 border-gray-500 text-black';
      break;
    case 'QUEUED':
      activeStyles = 'bg-lime-500 border-blue-500 text-black';
      break;
    case 'INFERENCE':
      activeStyles = 'bg-lime-500 border-lime-500 text-black';
      break;
    case 'ERROR':
      activeStyles = 'bg-red-200 border-red-600 text-black';
      break;
  }

  // CHANGE 1: Replaced `flex-1` with `flex-grow` and `basis-28`.
  // `flex-grow` allows the item to expand if there's extra space.
  // `basis-28` gives it a starting width of 7rem (112px), preventing it from squishing too small.
  return (
    <div className={`flex-grow basis-28 border-2 py-2 text-center font-sans text-base font-bold uppercase transition-colors duration-200 rounded-md ${isActive ? activeStyles : inactiveStyles}`}>
      {label}
    </div>
  );
};


// --- Main Panel Component (Layout Updated) ---

export function QueryStatusPanel() {
  const { chats, currentChatId, workers } = useChat();

  const currentChat = useMemo(() => chats.find(c => c.id === currentChatId), [chats, currentChatId]);
  const query = currentChat?.activeQuery;
  const status: QueryStatus = query?.status || 'IDLE';

  const allocatedWorker = useMemo(() => {
    if (status !== 'INFERENCE') return null;
    return workers.find(w => w.state === 'processing' || w.state === 'ok');
  }, [status, workers]);

  const workerName = allocatedWorker?.node_id || (status === 'INFERENCE' ? 'sllm_worker_0' : '-');
  const queuePosition = status === 'QUEUED' && query?.queuePosition ? query.queuePosition : '-';
  
  const STATUS_ORDER: QueryStatus[] = ['IDLE', 'QUEUED', 'INFERENCE', 'ERROR'];

  return (
    <div className="relative w-full h-full bg-transparent pointer-events-none">
      <div className="relative w-[90%] h-full mx-auto">
        <div className="absolute top-4 left-4 right-4 md:top-6 flex flex-col font-sans text-lg font-bold text-black z-10 pointer-events-auto">
          <p>WORKER ALLOCATED: {workerName}</p>
          <p>QUEUE POSITION: {queuePosition}</p>
        </div>

        {/* --- Bottom Status Indicators Container (Updated) --- */}
        {/* CHANGE 2: Added `flex-wrap` and changed `gap-x-3` to a universal `gap-2`. */}
        {/* `flex-wrap` allows the items to stack onto new lines. */}
        {/* `gap-2` provides spacing both horizontally and vertically when items wrap. */}
        <div className="absolute bottom-4 left-4 right-4 md:bottom-6 flex flex-wrap gap-2 z-10 pointer-events-auto">
          {STATUS_ORDER.map(s => (
            <StatusIndicator key={s} label={s} isActive={status === s} />
          ))}
        </div>
      </div>
    </div>
  );
}
