/* components/Chat/ChatBar.tsx */
"use client";

import React from "react";
import { useChat } from "@/context/ChatProvider";

export default function ChatBar() {
  const { chats, models, currentChatId, getModels, updateChatModel } =
    useChat();

  const currentChat = chats.find((c) => c.id === currentChatId);

  /* ── UI ─────────────────────────────────────────────────────── */
  return (
    <header className="flex-shrink-0 flex items-center gap-2 p-4 bg-white/90 backdrop-blur-sm z-10">
      <select
        disabled={!currentChat || models.length === 0}
        value={currentChat?.model || ""}
        onChange={(e) =>
          currentChat && updateChatModel(currentChat.id, e.target.value)
        }
        className="border rounded p-2 text-sm text-gray-800 disabled:opacity-40"
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </header>
  );
}
