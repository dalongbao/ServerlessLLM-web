"use client";
import React from "react";
import { RefreshCw } from "lucide-react";

interface RetryButtonProps {
  onRetry: () => void;
  isRetrying?: boolean;
  className?: string;
}

export default function RetryButton({ onRetry, isRetrying = false, className = "" }: RetryButtonProps) {
  return (
    <button
      onClick={onRetry}
      disabled={isRetrying}
      className={`
        inline-flex items-center gap-2 px-3 py-2 text-sm font-medium 
        text-blue-600 hover:text-blue-700 
        bg-blue-50 hover:bg-blue-100 
        border border-blue-200 rounded-lg
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200
        ${className}
      `}
    >
      <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
      {isRetrying ? 'Retrying...' : 'Retry'}
    </button>
  );
}