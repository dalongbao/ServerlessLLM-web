"use client";

import { useChat } from "@/context/ChatProvider";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import MessageBubble from "./MessageBubble";
import React from "react";

/**
 * ChatWindow — right-half chat pane.
 * ------------------------------------------------------
 * • User messages → right‑aligned blue bubble (70 % max‑width).
 * • Assistant messages → plain markdown occupying full width.
 * • Text input expands up to 10 % height, Shift+Enter newline, Tab indent.
 */
export default function ChatWindow() {
  const { chats, currentChatId, sendMessage } = useChat();
  const chat = chats.find((c) => c.id === currentChatId);
  const [draft, setDraft] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  /* ----- Helpers ------------------------------------------------ */
  // Auto‑resize the textarea (max 10 % of viewport height)
  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const max = window.innerHeight * 0.1;
    ta.style.height = Math.min(ta.scrollHeight, max) + "px";
    ta.style.overflowY = ta.scrollHeight > max ? "auto" : "hidden";
  };
  React.useEffect(() => autoResize(), [draft]);

  // Auto‑scroll when new messages arrive
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages.length]);

  if (!chat) return null;

  const send = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    await sendMessage(chat.id, trimmed);
    setDraft("");
    autoResize();
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault()
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
    <section className="chat-window fixed right-0 top-0 h-screen w-1/2 bg-white font-[Calibri] text-black flex flex-col border-l border-gray-200">
      {/* Message list */}
      <div className="messages grow overflow-y-auto px-4 py-4 space-y-4">
        {chat.messages.map((m) =>
          m.role === "assistant" ? (
            // Assistant: full‑width plain markdown
            <div key={m.id} className="w-full whitespace-pre-wrap">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {m.content}
              </ReactMarkdown>
            </div>
          ) : (
            // User: right‑aligned bubble
            <div key={m.id} className="flex w-full justify-end">
              <div className="max-w-[70%]">
                <MessageBubble role="user">{m.content}</MessageBubble>
              </div>
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="input-bar sticky bottom-0 left-0 w-full flex items-center gap-2 border-t border-gray-200 bg-white p-3"
      >
        <textarea
          ref={textareaRef}
          className="flex-1 rounded-lg bg-gray-100 p-2 outline-none resize-none max-h-[10vh] whitespace-pre-wrap"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything"
          rows={1}
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
          disabled={!draft.trim()}
        >
          Send
        </button>
      </form>
    </section>
  );
}
