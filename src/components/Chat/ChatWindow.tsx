"use client";
import { useChat } from "@/context/ChatProvider";
import MessageBubble from "./MessageBubble";
import MessageContent from "./MessageContent";
import NewChatPage from "./NewChatPage";
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

  if (!chat) return <NewChatPage />;

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
    <section className="flex flex-1 flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/30 font-[Calibri] text-black">
      <div className="flex-1 space-y-6 overflow-y-auto px-8 py-6 max-w-4xl mx-auto w-full">
        {chat.messages.map((m) =>
          m.role === "assistant" ? (
            <div key={m.id} className="w-full whitespace-pre-wrap">
              <div className="mb-2 font-semibold text-slate-600 text-sm">
                {m.model?.split("/").pop() || m.model}
              </div>
              {m.content ? (
                <MessageContent content={m.content} />
              ) : (
                <div className="inline-block max-w-[70%] rounded-2xl bg-gradient-to-br from-white to-slate-50 px-6 py-4 border border-slate-200/60 shadow-lg backdrop-blur-sm">
                  <span className="block text-4xl font-bold leading-none text-slate-400 animate-pulse">
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
      {/* Enhanced Input bar */}
      <div className="p-6 pr-10 pl-10 flex-shrink-0 border-t border-slate-200/60 bg-gradient-to-r from-white/80 to-slate-50/80 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto w-full">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!waiting) send();
            }}
            className="flex items-end gap-3 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 p-2 shadow-xl backdrop-blur-sm"
          >
            <textarea
              ref={textareaRef}
              className="flex-1 resize-none self-center bg-transparent pr-4 pl-4 outline-none max-h-[10vh] whitespace-pre-wrap disabled:bg-slate-50/50 text-lg placeholder-slate-500"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                waiting ? "Waiting for response..." : 
                isServerUnhealthy ? "Server unhealthy - cannot send messages" : 
                "Ask anything..."
              }
              rows={1}
              disabled={waiting || isServerUnhealthy}
            />
            <button
              type="button"
              onClick={waiting ? handleStop : send}
              className={`flex items-center justify-center rounded-xl px-4 py-3 text-white transition-all duration-300 shadow-lg backdrop-blur-sm ${
                waiting
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 hover:shadow-xl hover:shadow-red-500/25'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-40 hover:shadow-xl hover:shadow-blue-500/25 disabled:hover:shadow-none'
              }`}
              disabled={!waiting && (!draft.trim() || isServerUnhealthy)}
            >
              {waiting ? (
                <Square className="h-6 w-6" aria-label="Stop generating"/>
              ) : (
                <Send className="h-6 w-6" aria-label="Send message"/>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
