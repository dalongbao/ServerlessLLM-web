/* context/ChatProvider.tsx */
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import axios from "axios";

/* ── Constants ──────────────────────────────────────────────── */
const LLM_SERVER_URL =
  "https://standard-globe-pulse-active.trycloudflare.com";

/* ── Local typings ───────────────────────────────────────────── */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}
export interface Chat {
  id: string;
  title: string;
  model: string;
  messages: Message[];
}
export interface Model {
  id: string;
  name: string;
}

/* ── Context shape ──────────────────────────────────────────── */
interface ChatCtx {
  chats: Chat[];
  models: Model[];
  currentChatId: string;
  setCurrentChat: (id: string) => void;
  /**
   * Send a user message to the LLM and stream the assistant reply into state.
   * Returns a promise that resolves when the full assistant message has been
   * streamed into the chat history.
   */
  sendMessage: (chatId: string, userContent: string) => Promise<void>;
  /** Manually create a new, empty chat. */
  addChat: (chat: Chat) => void;
}

const ChatContext = createContext<ChatCtx | null>(null);
export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};

/* ── Helper utilities ───────────────────────────────────────── */
const generateId = () => crypto.randomUUID();

/**
 * Convert our internal Message[] → OpenAI chat payload shape
 */
const toChatFormat = (msgs: Message[]) =>
  msgs.map((m) => ({ role: m.role, content: m.content }));

/* ── Provider ───────────────────────────────────────────────── */
export function ChatProvider({ children }: { children: ReactNode }) {
  /* Start with an empty chat list; we'll create the first chat on mount */
  const [chats, setChats] = useState<Chat[]>([]);

  /* Hard‑code a single model for now (can be fetched later) */
  const [models] = useState<Model[]>([
    { id: "facebook/opt-1.3b", name: "OPT‑1.3B" },
  ]);

  const [currentChatId, setCurrentChat] = useState<string>("");

  /* Local ref for mimicking streaming */
  const simulationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ----- Lifecycle: create an initial chat -------------------- */
  useEffect(() => {
    if (chats.length === 0) {
      const firstChat: Chat = {
        id: generateId(),
        title: "New chat",
        model: "model",
        messages: [],
      };
      setChats([firstChat]);
      setCurrentChat(firstChat.id);
    }
  }, [chats.length]);

  /* ----- Mutators ------------------------------------------------ */
  const addChat = (chat: Chat) => {
    setChats((list) => [...list, chat]);
    setCurrentChat(chat.id);
  };

  /** Append a message to the given chat */
  const appendMessage = (chatId: string, msg: Message) =>
    setChats((list) =>
      list.map((c) =>
        c.id === chatId ? { ...c, messages: [...c.messages, msg] } : c,
      ),
    );

  /* ----- Core action: send a message ---------------------------- */
  const sendMessage = async (chatId: string, userContent: string) => {
    const trimmed = userContent.trim();
    if (!trimmed) return;

    // 1️⃣  Optimistically add the user's message + a placeholder assistant msg
    const userMsg: Message = { id: generateId(), role: "user", content: trimmed };
    const assistantPlaceholder: Message = {
      id: generateId(),
      role: "assistant",
      content: "", // will be filled while streaming
    };

    appendMessage(chatId, userMsg);
    appendMessage(chatId, assistantPlaceholder);

    // 2️⃣ Build payload for the LLM
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;

    const chatPayload = [
      { role: "system", content: "You are a helpful assistant." },
      ...toChatFormat(chat.messages),
      { role: "user", content: trimmed },
    ];

    // 3️⃣  Fire request
    try {
      if (simulationTimeoutRef.current) {
        clearTimeout(simulationTimeoutRef.current);
      }

      const response = await axios.post(
        `${LLM_SERVER_URL}/v1/chat/completions`,
        {
          model: models[0].id,
          messages: chatPayload,
        },
        {
          headers: { "Content-Type": "application/json" },
          proxy: false,
        },
      );

      // 4️⃣  Stream (simulate) assistant response into state
      const fullAssistantReply: string = response.data.choices[0].message.content;
      await simulateStreamingResponse(chatId, assistantPlaceholder.id, fullAssistantReply);
    } catch (err) {
      console.error(err);
      // Replace placeholder with error text
      setChats((list) =>
        list.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantPlaceholder.id
                    ? {
                        ...m,
                        content: "⚠️ Error processing request. Please try again.",
                      }
                    : m,
                ),
              }
            : c,
        ),
      );
    }
  };

  /* ----- Helpers ------------------------------------------------- */
  /**
   * Gradually writes the assistant response into the placeholder message so
   * we get that nice “typing” animation effect.
   */
  const simulateStreamingResponse = (
    chatId: string,
    assistantMsgId: string,
    botResponse: string,
  ) =>
    new Promise<void>((resolve) => {
      let i = 0;
      const tick = () => {
        setChats((list) =>
          list.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: botResponse.slice(0, i) } : m,
                  ),
                }
              : c,
          ),
        );
        if (i < botResponse.length) {
          i += 1;
          simulationTimeoutRef.current = setTimeout(tick, 20);
        } else {
          resolve();
        }
      };
      tick();
    });

  /* ----- Cleanup ------------------------------------------------- */
  useEffect(
    () => () => {
      if (simulationTimeoutRef.current) clearTimeout(simulationTimeoutRef.current);
    },
    [],
  );

  /* ----- Context value ------------------------------------------ */
  const value: ChatCtx = {
    chats,
    models,
    currentChatId,
    setCurrentChat,
    sendMessage,
    addChat,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
