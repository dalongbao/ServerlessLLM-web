"use client";

import React from "react";
import { Chat } from "@/context/types";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  chat: Chat | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmationModal({ isOpen, chat, onClose, onConfirm }: DeleteConfirmationModalProps) {
  if (!isOpen || !chat) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm" 
        onClick={(e) => e.stopPropagation()} 
      >
        <h2 className="text-lg font-semibold text-gray-900">Delete Chat?</h2>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to delete&nbsp;
          &ldquo;<strong>{chat.title}</strong>&rdquo;? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end space-x-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
