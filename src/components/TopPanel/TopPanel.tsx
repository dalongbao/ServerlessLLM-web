// src/components/TopPanel/TopPanel.tsx
"use client";
import React from 'react';
import { WorkerPanel } from '@/components/TopPanel/WorkerPanel';
import { ChatProvider } from "@/context/ChatProvider";

export default function TopPanel({ className = "" }: { className?: string }) {
  return (
    // The ChatProvider makes the `useChat` hook available to all children,
    // including our WorkerPanel. It will provide the `workers` data.
    <ChatProvider>
      <div className={className}>
        <WorkerPanel />
      </div>
    </ChatProvider>
  );
}
