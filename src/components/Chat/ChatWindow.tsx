/* components/Chat/ChatWindow.tsx */
"use client";

import { useChat } from "@/context/ChatProvider";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import MessageBubble from "./MessageBubble";
import React from "react";
import { useLayoutEffect } from "react";

export default function ChatWindow() {
  const { chats, currentChatId, sendMessage } = useChat();
  const chat = chats.find((c) => c.id === currentChatId);
  const [draft, setDraft] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const waiting =
    !!chat?.messages.find(
      (m) => m.role === "assistant" && m.content.length === 0,
    );

  /* ----- Helpers ------------------------------------------------ */
  // Auto‑resize the textarea (max 10 % of viewport height)
  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const max = window.innerHeight * 0.1;
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
    ta.style.overflowY = ta.scrollHeight > max ? "auto" : "hidden";
  };
  React.useEffect(() => autoResize(), [draft]);

  // Auto‑scroll when new messages arrive
  useLayoutEffect(() => {
    if (chat) {
      // block:'end' is the default, behaviour 'auto' = no animation
      endRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [chat?.id]);

  if (!chat) return null;

  const send = async () => {
    if (waiting) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    sendMessage(chat.id, trimmed).catch(console.error);
    // We need to manually reset the height after sending
    setDraft("");
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
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

  /* ----- Render ------------------------------------------------- */
  return (
    <section className="flex flex-1 flex-col overflow-hidden bg-white font-[Calibri] text-black">
      {/* Message list - grows to fill available space and scrolls internally */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {chat.messages.map((m) =>
          m.role === "assistant" ? (
            <div key={m.id} className="w-full whitespace-pre-wrap">
              {/* model name */}
              <div className="mb-1 font-bold text-gray-600">
                {m.model?.split("/").pop() || m.model}
              </div>

              {/* 👇 NEW: show loader while content is empty */}
              {m.content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {m.content}
                </ReactMarkdown>
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
            send();
          }}
          className="flex items-center gap-2 rounded-2xl border bg-gray-50 p-1 pr-2"
        >
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none self-center bg-transparent p-2 outline-none max-h-[10vh] whitespace-pre-wrap"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything"
            rows={1}
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
            disabled={waiting || !draft.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </section>
  );
}
