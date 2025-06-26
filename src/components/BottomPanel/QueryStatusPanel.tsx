// src/components/BottomPanel/QueryStatusPanel.tsx

"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useChat } from '@/context/ChatProvider';
import { QueryStatus } from '@/context/types';

// Define a type for our time object for clarity
type TimeObject = {
  minutes: string;
  seconds: string;
  milliseconds: string;
};

const INITIAL_TIME: TimeObject = { minutes: '00', seconds: '00', milliseconds: '00' };

// --- Helper Components (Unchanged from previous correct version) ---

const TimeDisplay = ({ time }: { time: TimeObject }) => (
  <div className="font-seven-segment flex items-baseline text-cyan-400" style={{ lineHeight: '1' }}>
    <span className="text-7xl md:text-8xl lg:text-9xl">{time.minutes}:{time.seconds}</span>
    <span className="text-4xl md:text-5xl lg:text-6xl">:{time.milliseconds}</span>
  </div>
);

const ModelDisplayBox = ({ modelName }: { modelName: string | null }) => {
  if (!modelName) {
    return (
      <div className="border border-slate-600 rounded-md min-h-[76px] flex items-center justify-center">
        <div className="font-helvetica-narrow text-2xl uppercase text-slate-600">
          MODEL
        </div>
      </div>
    );
  }
  const parts = modelName.split('/');
  const owner = parts[0];
  const name = parts.length > 1 ? parts[1] : '';
  return (
    <div className="border border-slate-600 px-4 py-3 rounded-md min-h-[76px] flex items-center">
      <div className="font-mono text-xl md:text-2xl leading-tight text-left overflow-hidden">
        <div className="font-bold text-slate-400 truncate">{owner}{name && '/'}</div>
        <div className="font-bold text-slate-400 truncate">{name}</div>
      </div>
    </div>
  );
};

const QueueDisplayBox = ({ value }: { value: string | number }) => {
  return (
    <div className="border border-slate-600 px-4 py-3 flex items-center justify-start gap-x-5 rounded-md min-h-[76px]">
      <div className="font-helvetica-narrow text-sm md:text-base uppercase text-slate-400 leading-tight text-left font-bold">
        QUEUE<br/>POSITION
      </div>
      <div className="font-mono text-3xl md:text-4xl font-bold text-slate-200">
        {value}
      </div>
    </div>
  );
};

const StatusIndicator = ({ label, isActive, isError }: { label: string; isActive: boolean; isError?: boolean }) => {
    const activeClass = isError ? 'bg-red-500 border-red-500 text-white' : 'bg-cyan-400 border-cyan-400 text-slate-900';
    const inactiveClass = 'bg-transparent border-slate-600 text-slate-400';
    return (
        <div className={`flex-1 border py-2 text-center font-helvetica-narrow text-sm md:text-base font-bold uppercase transition-colors duration-200 rounded-md ${isActive ? activeClass : inactiveClass}`}>
            {label}
        </div>
    );
};


// --- Main Panel Component (LOGIC & LAYOUT CHANGES HERE) ---

export function QueryStatusPanel() {
  const { chats, currentChatId } = useChat();

  const [timeHistory, setTimeHistory] = useState<Record<string, TimeObject>>({});
  const [currentTime, setCurrentTime] = useState<TimeObject>(INITIAL_TIME);
  const [lastUsedModel, setLastUsedModel] = useState<string | null>(null);
  
  const currentChat = useMemo(() => chats.find(c => c.id === currentChatId), [chats, currentChatId]);
  const query = currentChat?.activeQuery;
  const status: QueryStatus = query?.status || 'IDLE';

  const prevStatusRef = useRef<QueryStatus>();
  useEffect(() => {
    prevStatusRef.current = status;
  });

  useEffect(() => {
    if (!currentChatId) return;
    const isQueryActiveInNewChat = query?.status === 'QUEUED' || query?.status === 'INFERENCE';
    if (!isQueryActiveInNewChat) {
      setCurrentTime(timeHistory[currentChatId] || INITIAL_TIME);
    }
  }, [currentChatId, timeHistory]); // Added timeHistory dependency to ensure re-render if history updates while on the same chat

  useEffect(() => {
    if (!query || !query.startTime || !currentChatId) return;
    const isQueryActive = status === 'QUEUED' || status === 'INFERENCE';
    const wasQueryActive = prevStatusRef.current === 'QUEUED' || prevStatusRef.current === 'INFERENCE';

    if (wasQueryActive && !isQueryActive) {
      setTimeHistory(prev => ({ ...prev, [currentChatId]: currentTime }));
      return;
    }

    if (isQueryActive) {
      const intervalId = setInterval(() => {
        const elapsedMs = Date.now() - query.startTime;
        const minutes = Math.floor(elapsedMs / 1000 / 60).toString().padStart(2, '0');
        const seconds = Math.floor(elapsedMs / 1000 % 60).toString().padStart(2, '0');
        const milliseconds = (elapsedMs % 1000).toString().padStart(3, '0').slice(0, 2);
        setCurrentTime({ minutes, seconds, milliseconds });
      }, 47);
      return () => clearInterval(intervalId);
    }
  }, [status, query?.startTime, currentChatId, currentTime]);

  useEffect(() => {
    if (status === 'QUEUED') {
      setCurrentTime(INITIAL_TIME);
    }
  }, [status]);

  useEffect(() => {
    if (query?.model) {
      setLastUsedModel(query.model);
    }
  }, [query?.model]);

  const modelToDisplay = query?.model || lastUsedModel;
  const queueDisplayValue = status === 'QUEUED' && query?.queuePosition ? query.queuePosition : '-';
  const STATUS_ORDER: QueryStatus[] = ['IDLE', 'QUEUED', 'INFERENCE', 'ERROR'];

  return (
    // LAYOUT FIX: Added h-full and changed justify-end to justify-between
    // This makes the panel take up all parent height and pushes the status bar to the bottom.
    <div className="w-full h-full p-4 md:p-6 lg:p-8 flex flex-col justify-between gap-y-4">
      
      {/* Main content area now grows to fill available space */}
      <div className="flex flex-col md:flex-row gap-4 flex-grow">
        
        {/* Time container also grows and centers its content vertically */}
        <div className="flex-grow flex flex-col gap-1 min-w-0">
          <div className="font-helvetica-narrow text-sm uppercase text-slate-400 tracking-widest font-bold">
            Time Elapsed
          </div>
          {/* This wrapper now grows and centers the timer */}
          <div className="flex flex-grow items-center">
            <TimeDisplay time={currentTime} />
          </div>
        </div>

        {/* Details container remains the same */}
        <div className="flex flex-col gap-3 w-full md:w-56 flex-shrink-0">
          <ModelDisplayBox modelName={modelToDisplay} />
          <QueueDisplayBox value={queueDisplayValue} />
        </div>
      </div>

      {/* Status Indicators are pushed to the bottom by the flex-grow above */}
      <div className="flex gap-x-3">
        {STATUS_ORDER.map(s => (
          <StatusIndicator key={s} label={s} isActive={status === s} isError={s === 'ERROR' && status === 'ERROR'} />
        ))}
      </div>
    </div>
  );
}
