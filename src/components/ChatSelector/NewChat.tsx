"use client";

import { useChat } from "@/context/ChatProvider";
import { Plus } from "lucide-react";
import React from "react";

export default function NewChat() {
  const { addChat, chats, models } = useChat();

  const handleClick = () => {
    const mostRecentModel =
      chats[chats.length - 1]?.model || models[0]?.id || "facebook/opt-1.3b";

    addChat({
      id: crypto.randomUUID(),
      title: "New chat",
      model: mostRecentModel, // ✅ Use MRU or fallback
      models: [],             // ✅ Will be populated later
      messages: [],
    });
  };

  return (
    <button
      onClick={handleClick}
      className="h-[66px] w-[80%] mx-auto rounded-lg bg-blue-600 text-white flex items-center justify-center gap-2 transition hover:bg-blue-700 active:scale-100"
    >
      <Plus size={18} />
      New chat
    </button>
  );
}
