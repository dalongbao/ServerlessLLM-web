"use client";

import { useChat } from "@/context/ChatProvider";
import { Plus } from "lucide-react";
import React from "react";

export default function NewChat() {
  const { setCurrentChat } = useChat();

  const handleClick = () => {
    setCurrentChat("");
  };

  return (
    <div className="flex-shrink-0 p-2">
      <button
        onClick={handleClick}
        className="h-[66px] w-full mx-auto rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center gap-2 transition-all duration-300 hover:from-blue-600 hover:to-blue-700 hover:shadow-xl hover:shadow-blue-500/25 font-[Calibri] text-lg font-medium shadow-lg backdrop-blur-sm"
      >
        <Plus className="h-6 w-6 flex-shrink-0" />
        <span className="truncate">New chat</span>
      </button>
    </div>
  );
}