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
    <button
      onClick={handleClick}
      className="h-[66px] w-[90%] mx-auto rounded-lg bg-blue-600 text-white flex items-center justify-center gap-2 transition hover:bg-blue-700 active:scale-100"
    >
      <Plus size={18} />
      New chat
    </button>
  );
}
