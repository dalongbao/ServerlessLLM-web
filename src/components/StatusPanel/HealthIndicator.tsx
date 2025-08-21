"use client";
import React from "react";
import { AlertCircle, CheckCircle, AlertTriangle, HelpCircle } from "lucide-react";
import { HealthStatus } from "@/context/types";

interface HealthIndicatorProps {
  healthStatus: HealthStatus;
  className?: string;
}

export default function HealthIndicator({ healthStatus, className = "" }: HealthIndicatorProps) {
  const getStatusIcon = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <HelpCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'unhealthy':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return 'Server Healthy';
      case 'degraded':
        return 'Server Degraded';
      case 'unhealthy':
        return 'Server Unavailable';
      default:
        return 'Status Unknown';
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${getStatusColor()} ${className}`}>
      {getStatusIcon()}
      <div className="flex flex-col">
        <span className="font-medium">{getStatusText()}</span>
        {healthStatus.message && (
          <span className="text-xs opacity-75">{healthStatus.message}</span>
        )}
      </div>
      {healthStatus.status === 'unhealthy' && (
        <div className="ml-auto text-xs font-medium">
          Posting Disabled
        </div>
      )}
    </div>
  );
}