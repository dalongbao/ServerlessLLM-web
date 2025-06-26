"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useChat } from '@/context/ChatProvider';
import { QueryStatus } from '@/context/types';

// --- Helper Components ---

// Time Display: Now shows Minutes:Seconds:Milliseconds
const TimeDisplay = ({ time }: { time: { minutes: string; seconds:string; milliseconds: string } }) => (
  <div className="font-seven-segment flex items-baseline text-cyan-400" style={{ lineHeight: '1' }}>
    <span className="text-4xl sm:text-5xl lg:text-6xl">{time.minutes}:{time.seconds}</span>
    <span className="text-xl sm:text-2xl lg:text-3xl">:{time.milliseconds}</span>
  </div>
);

// The new, unified display box for details like Model and Queue
const DetailDisplayBox = ({ labelLines, value }: { labelLines: string[]; value: React.ReactNode }) => {
  return (
    <div className="border border-slate-600 bg-slate-900/50 px-3 py-2 flex items-center justify-start gap-4 rounded-md min-h-[56px]">
      <div className="font-helvetica-narrow text-xs uppercase text-slate-400 leading-tight text-left">
        {labelLines.map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < labelLines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
      <div className="font-mono text-base font-bold text-slate-200 leading-tight">
        {value}
      </div>
    </div>
  );
};

// Status Indicator: No changes needed here
const StatusIndicator = ({ label, isActive, isError }: { label: string; isActive: boolean; isError?: boolean }) => {
    const activeClass = isError ? 'bg-red-500 border-red-500 text-white' : 'bg-cyan-400 border-cyan-400 text-slate-900';
    const inactiveClass = 'bg-transparent border-slate-600 text-slate-400';
    return (
        <div className={`flex-1 border py-1 text-center font-helvetica-narrow text-xs font-bold uppercase transition-colors duration-200 rounded-md ${isActive ? activeClass : inactiveClass}`}>
            {label}
        </div>
    );
};


// --- Main Panel Component ---

export function QueryStatusPanel() {
  const { chats, currentChatId } = useChat();
  const [time, setTime] = useState({ minutes: '00', seconds: '00', milliseconds: '00' });
  // State to remember the last model used, for display when idle
  const [lastUsedModel, setLastUsedModel] = useState<string | null>(null);

  const currentChat = useMemo(() => chats.find(c => c.id === currentChatId), [chats, currentChatId]);
  const query = currentChat?.activeQuery;
  const status: QueryStatus = query?.status || 'IDLE';
  const isInactive = !query || status === 'IDLE' || status === 'RETURNED' || status === 'ERROR';

  // Effect to capture the last used model name
  useEffect(() => {
    if (query?.model) {
      setLastUsedModel(query.model);
    }
  }, [query?.model]);
  
  // Timer effect: Updated for Minutes, Seconds, and Milliseconds
  useEffect(() => {
    if (isInactive || !query?.startTime) {
      setTime({ minutes: '00', seconds: '00', milliseconds: '00' });
      return;
    }
    // Update interval is faster to show milliseconds smoothly
    const intervalId = setInterval(() => {
      const elapsedMs = Date.now() - query.startTime;
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
      const seconds = (totalSeconds % 60).toString().padStart(2, '0');
      // Get the first two digits of the milliseconds for a clean display
      const milliseconds = (elapsedMs % 1000).toString().padStart(3, '0').slice(0, 2);
      setTime({ minutes, seconds, milliseconds });
    }, 47); // Using a prime number interval can sometimes feel smoother

    return () => clearInterval(intervalId);
  }, [isInactive, query?.startTime]);

  // Prepare display values based on the new logic
  const modelDisplay = useMemo(() => {
    const modelToDisplay = query?.model || lastUsedModel;
    if (!modelToDisplay) return null; // Render nothing if no model info is available

    // During active inference, split the model name
    if (status === 'INFERENCE' || status === 'QUEUED') {
      const parts = modelToDisplay.split('/');
      if (parts.length > 1) {
        return <>{parts[0]}/<br/>{parts[1]}</>;
      }
    }
    // When idle, error, or returned, show the full name on one line
    return modelToDisplay;
  }, [status, query?.model, lastUsedModel]);

  // Show queue position or a dash, never greyed out
  const queueDisplayValue = status === 'QUEUED' && query?.queuePosition ? query.queuePosition : '-';
  
  const STATUS_ORDER: QueryStatus[] = ['IDLE', 'QUEUED', 'INFERENCE', 'ERROR'];

  return (
    <div className="w-full max-w-2xl mx-auto p-2 md:p-4 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-grow flex flex-col gap-1">
          <div className="font-helvetica-narrow text-xs md:text-sm uppercase text-slate-400 tracking-widest">
            Time Elapsed
          </div>
          <div className="flex items-center">
            <TimeDisplay time={time} />
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full md:w-56">
          {/* The model box now has no label and complex display logic */}
          <DetailDisplayBox 
            labelLines={[]} 
            value={modelDisplay} 
          />
          <DetailDisplayBox 
            labelLines={['QUEUE', 'POSITION']} 
            value={queueDisplayValue} 
          />
        </div>
      </div>

      <div className="flex gap-x-2">
        {STATUS_ORDER.map(s => (
          <StatusIndicator 
            key={s}
            label={s}
            isActive={status === s}
            isError={s === 'ERROR' && status === 'ERROR'}
          />
        ))}
      </div>
    </div>
  );
}
