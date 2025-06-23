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
const LLM_SERVER_URL = "https://chat.serverless-ai.com";
const STORAGE_KEY = "chat_history_v1";
const ID_KEY = "current_chat_id_v1";
const SERVER_WAITTIME = 60; 

/* ── Local typings ───────────────────────────────────────────── */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model: string;
}
export interface Chat {
  id: string;
  title: string;
  model: string;          // “current” model for this thread
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

  /** List → UI dropdown */
  getModels: () => Promise<void>;

  /** Change the model the *next* message will use */
  updateChatModel: (chatId: string, modelId: string) => void;

  /** Send user text, stream reply */
  sendMessage: (chatId: string, userContent: string) => Promise<void>;

  /** Manually add a brand-new chat */
  addChat: (chat: Chat) => void;
  renameChat: (id: string, newTitle: string) => void;
  deleteChat: (id: string) => void;
}

const ChatContext = createContext<ChatCtx | null>(null);
export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};

/* ── Helper utilities ───────────────────────────────────────── */
const generateId = () => crypto.randomUUID();
const toChatFormat = (msgs: Message[]) =>
  msgs.map(({ role, content }) => ({ role, content }));

/* ── Provider ───────────────────────────────────────────────── */
export function ChatProvider({ children }: { children: ReactNode }) {
  /* ① Chats --------------------------------------------------- */
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChat] = useState<string>("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const savedId = localStorage.getItem(ID_KEY);

      if (saved) {
        const parsed: Chat[] = JSON.parse(saved);
        if (parsed.length) {
          setChats(parsed);
          if (savedId && parsed.find((c) => c.id === savedId)) {
            setCurrentChat(savedId);
          } else {
            setCurrentChat(parsed[0].id); // fallback to first
          }
        }
      }
    } catch (err) {
      console.warn("Failed to restore chat history:", err);
    }
  }, []);

  /* ② Models -------------------------------------------------- */
  const [models, setModels] = useState<Model[]>([]);
  const getModels = async () => {
    try {
      const res = await axios.get(`${LLM_SERVER_URL}/v1/models`);
      // Extract just the id and use it for both id and name
      setModels(res.data.models.map((model: any) => ({
        id: model.id,
        name: model.id.split('/').pop() || model.id // Use the last part of ID as name
      })));
    } catch (err) {
      console.error("Failed to fetch models:", err);
      if (!models.length)
        setModels([{ id: "facebook/opt-1.3b", name: "OPT-1.3B" }]);
    }
  };

  /* Fetch once on mount */
  useEffect(() => {
    getModels().catch(console.error);
  }, []);

  /* ③ Create the first blank chat after we know at least one model */
  useEffect(() => {
    if (chats.length === 0 && models.length) {
      const firstChat: Chat = {
        id: generateId(),
        title: "New chat",
        model: models[0]?.id || "default-model-id", // Add null check here
        messages: [],
      };
      setChats([firstChat]);
      setCurrentChat(firstChat.id);
    }
  }, [chats.length, models]);

  useEffect(() => {
    getModels();                         // immediate fetch
    const id = setInterval(getModels, 5_000);
    return () => clearInterval(id);
  }, [getModels]);

  /* ④ Helpers ------------------------------------------------- */
  const updateChatModel = (chatId: string, modelId: string) =>
    setChats((list) =>
      list.map((c) => (c.id === chatId ? { ...c, model: modelId } : c)),
    );

  const bumpChatModelIfNeeded = (chatId: string, newModel: string) =>
    setChats((list) =>
      list.map((c) =>
        c.id === chatId && c.model !== newModel ? { ...c, model: newModel } : c,
      ),
    );

  const appendMessage = (chatId: string, msg: Message) =>
    setChats((list) =>
      list.map((c) =>
        c.id === chatId ? { ...c, messages: [...c.messages, msg] } : c,
      ),
    );

  const renameChat = (id: string, title: string) => 
      setChats(list => list.map(c => (c.id === id ? {...c, title} : c)));

  const deleteChat = (id: string) => 
    setChats(list => list.filter(c => c.id !== id));

  /* For fake typing animation */
  const simulationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ⑤ Core action: send a message ---------------------------- */
  const sendMessage = async (chatId: string, userContent: string) => {
    const trimmed = userContent.trim();
    if (!trimmed) return;

    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;

    // 1️⃣  Add user + placeholder assistant msgs (with chat.model)
    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: trimmed,
      model: chat.model,
    };
    const assistantPlaceholder: Message = {
      id: generateId(),
      role: "assistant",
      content: "",
      model: chat.model,
    };
    appendMessage(chatId, userMsg);
    appendMessage(chatId, assistantPlaceholder);

    // 2️⃣  Build payload
    const chatPayload = [
      { role: "system", content: "You are a helpful assistant." },
      ...toChatFormat(chat.messages),
      { role: "user", content: trimmed },
    ];

    // 3️⃣  Call the LLM
    try {
      if (simulationTimeoutRef.current) clearTimeout(simulationTimeoutRef.current);

      const response = await axios.post(
        `${LLM_SERVER_URL}/v1/chat/completions`,
        {
          model: chat.model,
          messages: chatPayload,
        },
        { headers: { "Content-Type": "application/json" }, proxy: false },
      );

      // 4️⃣  Stream reply
      const fullAssistantReply: string = response.data.choices[0].message.content;
      await simulateStreamingResponse(chatId, assistantPlaceholder.id, fullAssistantReply);

      // 5️⃣  Keep chat.model in sync with the last used model
      bumpChatModelIfNeeded(chatId, chat.model);
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
                    ? { ...m, content: "⚠️ Error processing request. Please try again." }
                    : m,
                ),
              }
            : c,
        ),
      );
    }
  };

  /* ⑥ Typing-animation helper ------------------------------- */
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
          simulationTimeoutRef.current = setTimeout(tick, SERVER_WAITTIME);
        } else {
          resolve();
        }
      };
      tick();
    });

  /* ⑦ Cleanup ------------------------------------------------ */
  useEffect(
    () => () => {
      if (simulationTimeoutRef.current) clearTimeout(simulationTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
      localStorage.setItem(ID_KEY, currentChatId);
    } catch (err) {
      console.warn("Unable to save chat history:", err);
    }
  }, [chats, currentChatId]);

  /* ⑧ Context value ----------------------------------------- */
  const value: ChatCtx = {
    chats,
    models,
    currentChatId,
    setCurrentChat,
    getModels,
    updateChatModel,
    sendMessage,
    addChat: (chat) => {
      setChats((list) => [...list, chat]);
      setCurrentChat(chat.id);
    },
    renameChat,
    deleteChat,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
