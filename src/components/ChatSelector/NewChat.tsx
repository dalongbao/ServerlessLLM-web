
/* components/NewChatButton.tsx */
"use client";

import { useChat } from "@/context/ChatProvider";
import { Plus } from "lucide-react";
import React from "react";

export default function NewChat() {
  const { addChat } = useChat();

  const handleClick = () => {
    addChat({
      id: crypto.randomUUID(),
      title: "New chat",
      model: "model",
      messages: [],
    });
  };

  return (
    <button
      onClick={handleClick}
      className="h-[66px] w-[80%] mx-auto rounded-lg bg-blue-600 text-white flex items-center justify-center gap-2 transition hover:bg-blue-700 active:scale-100 items-center"
    >
      <Plus size={18} />
      New chat
    </button>
  );
}
