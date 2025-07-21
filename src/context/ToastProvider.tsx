"use client";
import React, { createContext, useContext, ReactNode } from "react";
import { ToastManager, useToast, Toast } from "@/components/Toast/Toast";

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  showError: (title: string, message: string, persistent?: boolean) => string;
  showConnectionError: (title: string, message: string) => string;
  showSuccess: (title: string, message: string) => string;
  showInfo: (title: string, message: string) => string;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, addToast, removeToast, clearToasts } = useToast();

  const showError = (title: string, message: string, persistent = false) => {
    return addToast({
      type: 'error',
      title,
      message,
      persistent,
      duration: persistent ? 0 : 5000
    });
  };

  const showConnectionError = (title: string, message: string) => {
    return addToast({
      type: 'connection_error',
      title,
      message,
      persistent: true, // Connection errors should be persistent until resolved
      duration: 0
    });
  };

  const showSuccess = (title: string, message: string) => {
    return addToast({
      type: 'success',
      title,
      message,
      duration: 3000
    });
  };

  const showInfo = (title: string, message: string) => {
    return addToast({
      type: 'info',
      title,
      message,
      duration: 4000
    });
  };

  const value: ToastContextType = {
    addToast,
    removeToast,
    clearToasts,
    showError,
    showConnectionError,
    showSuccess,
    showInfo
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastManager toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}