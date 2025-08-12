"use client";

import React, { useMemo } from 'react';
import { useChat } from '@/context/ChatProvider';
import { QueryStatus } from '@/context/types';

const STATUS_ORDER: QueryStatus[] = ['IDLE', 'QUEUED', 'INFERENCE'];

const StatusIndicator = ({ label, isActive, isError }: { label: QueryStatus; isActive: boolean; isError: boolean; }) => {
  const baseStyles = 'flex-grow basis-28 py-2 text-center font-[Calibri] text-lg font-bold uppercase rounded-md transition-all duration-300 ease-in-out';
  const inactiveStyles = 'bg-gray-100 border border-gray-300 text-gray-500';
  let activeStyles = 'text-gray-800 shadow-lg';

  switch (label) {
    case 'IDLE':
      activeStyles += ' bg-blue-100 border border-blue-300';
      break;
    case 'QUEUED':
      activeStyles += ' bg-yellow-100 border border-yellow-300 animate-pulse';
      break;
    case 'INFERENCE':
      activeStyles += ' bg-green-100 border border-green-300';
      break;
  }

  if (isError) {
    return (
      <div className={`${baseStyles} bg-red-100 border border-red-300 text-red-800 shadow-lg flex items-center justify-center gap-2`}>
        <span>ERROR</span>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`${baseStyles} ${isActive ? activeStyles : inactiveStyles}`}>
      {label}
    </div>
  );
};

export function QueryStatusPanel() {
  const { chats, currentChatId } = useChat();

  const currentChat = useMemo(() => chats.find(c => c.id === currentChatId), [chats, currentChatId]);
  const query = currentChat?.activeQuery;
  const status: QueryStatus = query?.status || 'IDLE';
  const queuePosition = status === 'QUEUED' && query?.queuePosition ? query.queuePosition : '-';
  const isError = status === 'ERROR';

  return (
    <div className="relative w-full h-full bg-transparent pointer-events-none">
      <div className="relative w-[90%] h-full mx-auto">
        <div className="absolute top-4 left-4 right-4 md:top-6 flex flex-col font-[Calibri] text-lg font-bold text-gray-800 z-10 pointer-events-auto bg-gray-50 px-4 py-2 rounded-lg shadow-lg">
          <p>QUEUE POSITION: <span className="text-yellow-600">{queuePosition}</span></p>
        </div>
        <div className="absolute bottom-4 left-4 right-4 md:bottom-6 flex flex-wrap gap-2 z-10 pointer-events-auto">
          {STATUS_ORDER.map(s => (
            <React.Fragment key={s}>
              <StatusIndicator label={s} isActive={status === s && !isError} isError={false} />
              {s !== 'INFERENCE' && (
                <div className="flex items-center">
                  <div className="w-4 h-0.5 bg-gray-300" />
                </div>
              )}
            </React.Fragment>
          ))}
          {isError && (
            <>
              <div className="flex items-center">
                <div className="w-4 h-0.5 bg-gray-300" />
              </div>
              <StatusIndicator label="ERROR" isActive={false} isError={true} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}