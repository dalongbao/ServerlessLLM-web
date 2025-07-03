"use client";

import React, { useState, useRef, useEffect } from "react";
import { useChat } from "@/context/ChatProvider";
import { ChevronDown } from "lucide-react";

export default function ChatBar() {
  const { chats, models, currentChatId, updateChatModel} = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentChat = chats.find((c) => c.id === currentChatId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (modelId: string) => {
    if (currentChat) {
      updateChatModel(currentChat.id, modelId);
    }
    setIsOpen(false);
  };

  const isDisabled = !currentChat || models.length === 0;
  const currentModelName = currentChat 
    ? models.find(m => m.id === currentChat.model)?.name || "Select model"
    : "Select model";

  return (
    <header className="flex-shrink-0 flex items-center gap-2 p-4 bg-white/90 backdrop-blur-sm z-10">
      <div 
        ref={dropdownRef} 
        className={`relative ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <button
          disabled={isDisabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-inset ring-gray-200 transition-all ${
            isDisabled 
              ? '' 
              : 'hover:bg-gray-50 hover:ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500'
          }`}
        >
          <span className="truncate max-w-[160px]">{currentModelName}</span>
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-20 mt-2 w-full min-w-[200px] rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
            <ul className="py-1 max-h-60 overflow-auto">
              {models.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => handleSelect(m.id)}
                    className={`block w-full px-4 py-2 text-left text-sm ${
                      currentChat?.model === m.id
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {m.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
