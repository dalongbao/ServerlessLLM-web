"use client";
import { useChat } from "@/context/ChatProvider";
import React from "react";
import { Send } from "lucide-react";

export default function NewChatPage() {
  const { chats, models, addChat, setCurrentChat, sendMessage } = useChat();
  const [draft, setDraft] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const mostRecentModel = 
    chats[chats.length - 1]?.model || models[0]?.id || "facebook/opt-1.3b";

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const max = window.innerHeight * 0.3;
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
    ta.style.overflowY = ta.scrollHeight > max ? "auto" : "hidden";
  };
  React.useEffect(() => autoResize(), [draft]);

  const createChatAndSend = async () => {
    if (isCreating) return;
    const trimmed = draft.trim();
    if (!trimmed) return;

    setIsCreating(true);
    
    try {
      const newChatId = crypto.randomUUID();
      
      addChat({
        id: newChatId,
        title: "New chat",
        model: mostRecentModel,
        models: [],
        messages: [],
        isActive: false,
        activeQuery: null,
      });
      
      setCurrentChat(newChatId);
      
      await sendMessage(newChatId, trimmed);
    } catch (error) {
      console.error('Failed to create chat and send message:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isCreating) {
        createChatAndSend();
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
    <section className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/30 font-[Calibri] text-black px-8 py-6">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            How can I help you today?
          </h1>
          <p className="text-lg text-slate-600">
            Start a conversation with {mostRecentModel.split("/").pop() || mostRecentModel}
          </p>
        </div>
        
        <div className="w-full">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isCreating) createChatAndSend();
            }}
            className="flex items-end gap-3 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 p-2 shadow-xl backdrop-blur-sm"
          >
            <textarea
              ref={textareaRef}
              className="flex-1 resize-none self-center bg-transparent pr-4 pl-4 pt-4 outline-none max-h-[30vh] whitespace-pre-wrap text-lg disabled:bg-slate-50/50 placeholder-slate-500"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isCreating ? "Creating your chat..." : "Ask me anything..."}
              rows={3}
              disabled={isCreating}
              autoFocus
            />
            <button
              type="button"
              onClick={createChatAndSend}
              className={`flex items-center justify-center rounded-xl px-4 py-3 text-white transition-all duration-300 shadow-lg backdrop-blur-sm ${
                isCreating
                  ? 'bg-gradient-to-r from-slate-400 to-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-40 hover:shadow-xl hover:shadow-blue-500/25 disabled:hover:shadow-none'
              }`}
              disabled={isCreating || !draft.trim()}
            >
              <Send className="h-6 w-6" aria-label="Send message"/>
            </button>
          </form>
        </div>
        
        <div className="text-center text-sm text-slate-500">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </section>
  );
}