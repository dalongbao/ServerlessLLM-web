// src/components/TopPanel/TopPanel.tsx
"use client";
import React from 'react';
import { WorkerPanel } from '@/components/TopPanel/WorkerPanel';

// No need to import ChatProvider here, it will be higher up in the tree
// import { ChatProvider } from "@/context/ChatProvider";

export default function TopPanel({ className = "" }: { className?: string }) {
  return (
    // Use flex-col and justify-between to push the status panel to the bottom
    // h-full ensures this container takes up the full height of its parent
    <div className={`flex flex-col justify-between h-full ${className}`}>
      <WorkerPanel />
    </div>
  );
}
