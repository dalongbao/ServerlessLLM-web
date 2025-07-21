"use client";
import { useChat } from "@/context/ChatProvider";
import MessageBubble from "./MessageBubble";
import MessageContent from "./MessageContent";
import React from "react";
import { useLayoutEffect } from "react";
import { Send, Square } from "lucide-react";

export default function ChatWindow() {
  const { chats, currentChatId, sendMessage, cancelQuery, healthStatus } = useChat();
  const chat = chats.find((c) => c.id === currentChatId);
  const [draft, setDraft] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  const waiting = chat?.isActive ?? false;
  const isModelSelected = !!chat?.model;
  const isServerUnhealthy = healthStatus.status === 'unhealthy';

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const max = window.innerHeight * 0.1;
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
    ta.style.overflowY = ta.scrollHeight > max ? "auto" : "hidden";
  };
  React.useEffect(() => autoResize(), [draft]);

  useLayoutEffect(() => {
    if (chat) {
      endRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [chat, chat?.id, chat?.messages.length]); 

  if (!chat) return null;

  const send = async () => {
    if (waiting || !isModelSelected || isServerUnhealthy) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    try {
      await sendMessage(chat.id, trimmed);
      setDraft("");
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // You could show a toast notification here
    }
  };

  const handleStop = () => {
    if (waiting) {
      cancelQuery(chat.id, 'cancelled');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!waiting) {
        send();
      }
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      setDraft(val.slice(0, start) + "\t" + val.slice(end));
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 1;
      });
    }
  };

  return (
    <section className="flex flex-1 flex-col overflow-hidden bg-white font-[Calibri] text-black">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {chat.messages.map((m) =>
          m.role === "assistant" ? (
            <div key={m.id} className="w-full whitespace-pre-wrap">
              <div className="mb-1 font-bold text-gray-600">
                {m.model?.split("/").pop() || m.model}
              </div>
              {m.content ? (
                <MessageContent content={m.content} />
              ) : (
                <div className="inline-block max-w-[70%] rounded-xl bg-gray-200 px-3 py-1">
                  <span className="block text-4xl font-bold leading-none text-gray-500 animate-pulse">
                    …
                  </span>
                </div>
              )}
            </div>
          ) : (                
            <div key={m.id} className="flex w-full justify-end">
              <div className="max-w-[70%]">
                <MessageBubble role="user">{m.content}</MessageBubble>
              </div>
            </div>
          )
        )}
        <div ref={endRef} />
      </div>
      {/* Input bar - stays at the bottom */}
      <div className="p-3 flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!waiting) send();
          }}
          className="flex items-end gap-2 rounded-2xl border bg-gray-50 p-1 pr-2"
        >
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none self-center bg-transparent p-2 outline-none max-h-[10vh] whitespace-pre-wrap disabled:bg-gray-100"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              waiting ? "Waiting for response..." : 
              isServerUnhealthy ? "Server unhealthy - cannot send messages" : 
              "Ask anything"
            }
            rows={1}
            disabled={waiting || isServerUnhealthy}
          />
          <button
            type="button"
            onClick={waiting ? handleStop : send}
            className={`flex items-center justify-center rounded-lg px-3 py-2 text-white transition-colors ${
              waiting
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-40'
            }`}
            disabled={!waiting && (!draft.trim() || isServerUnhealthy)}
          >
            {waiting ? (
              <Square className="h-5 w-5" aria-label="Stop generating"/>
            ) : (
              <Send className="h-5 w-5" aria-label="Send message"/>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
