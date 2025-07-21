"use client";
import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, AlertTriangle, HelpCircle, X } from "lucide-react";
import { HealthStatus } from "@/context/types";

interface HealthPopupProps {
  healthStatus: HealthStatus;
}

export default function HealthPopup({ healthStatus }: HealthPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Show popup when status is degraded or unhealthy
  useEffect(() => {
    if (healthStatus.status === 'degraded' || healthStatus.status === 'unhealthy') {
      setIsVisible(true);
      setIsDismissed(false);
    } else {
      setIsVisible(false);
      setIsDismissed(false);
    }
  }, [healthStatus.status]);

  const getStatusIcon = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <HelpCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'degraded':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return 'Server Healthy';
      case 'degraded':
        return 'Server Degraded';
      case 'unhealthy':
        return 'Server Unhealthy';
      default:
        return 'Status Unknown';
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  // Don't show if dismissed or if healthy/unknown
  if (isDismissed || !isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`rounded-lg border shadow-lg p-4 ${getStatusColor()} animate-in slide-in-from-top-2 duration-300`}>
        <div className="flex items-start gap-3">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm">{getStatusText()}</h3>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 rounded p-1 hover:bg-black/10 transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {healthStatus.message && (
              <p className="text-sm mt-1 opacity-90">{healthStatus.message}</p>
            )}
            {healthStatus.status === 'unhealthy' && (
              <p className="text-sm mt-2 font-medium">
                ⚠️ Message sending is disabled
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}