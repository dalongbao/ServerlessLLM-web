"use client";
import React from 'react';
import { QueryStatusPanel } from '@/components/BottomPanel/QueryStatusPanel';

export default function BottomPanel({ className = "" }: { className?: string }) {
  return (
    // Use flex-col and justify-between to push the status panel to the bottom
    // h-full ensures this container takes up the full height of its parent
    <div className={`flex flex-col justify-between h-full ${className}`}>
      <QueryStatusPanel />
    </div>
  );
}
