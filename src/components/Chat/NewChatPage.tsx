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
      
      // Small delay to ensure state updates are processed before sending message
      await new Promise(resolve => setTimeout(resolve, 10));
      
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
    <section className="flex flex-1 flex-col items-center justify-center bg-white font-[Calibri] text-black p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">
            How can I help you today?
          </h1>
          <p className="text-lg text-gray-600">
            Start a conversation with {mostRecentModel.split("/").pop() || mostRecentModel}
          </p>
        </div>
        
        <div className="w-full">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isCreating) createChatAndSend();
            }}
            className="flex items-end gap-2 rounded-2xl border bg-gray-50 p-1 pr-2 shadow-lg"
          >
            <textarea
              ref={textareaRef}
              className="flex-1 resize-none self-center bg-transparent p-4 outline-none max-h-[30vh] whitespace-pre-wrap text-lg disabled:bg-gray-100"
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
              className={`flex items-center justify-center rounded-lg px-4 py-3 text-white transition-colors ${
                isCreating
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-40'
              }`}
              disabled={isCreating || !draft.trim()}
            >
              <Send className="h-6 w-6" aria-label="Send message"/>
            </button>
          </form>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </section>
  );
}