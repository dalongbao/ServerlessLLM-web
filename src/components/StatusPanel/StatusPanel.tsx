"use client";
import React from 'react';
import { WorkerPanel } from '@/components/StatusPanel/WorkerPanel';
import { QueryStatusPanel } from '@/components/StatusPanel/QueryStatusPanel';

export default function StatusPanel({ className = "" }: { className?: string }) {
  return (
    <div className={`relative h-full ${className}`}>
      <div className="absolute inset-0">
        <WorkerPanel />
      </div>
      <div className="absolute inset-0 pointer-events-none">
        <QueryStatusPanel/>
      </div>

    </div>
  );
}
