"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import axios from "axios";

/* ── Constants ──────────────────────────────────────────────── */
const LLM_SERVER_URL = "https://chat.serverless-ai.com";
const STORAGE_KEY = "chat_history_v1";
const ID_KEY = "current_chat_id_v1";
const SERVER_WAITTIME = 8;
const POLLING_INTERVAL = 10000;
const WORKER_POLLING_INTERVAL=5000;
const TIMEOUT = 3000000;

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
  model: string; // “current” model for this thread
  models: string[];
  messages: Message[];
}
export interface Model {
  id: string;
  name: string;
}

// ── 1. Worker Interface Definition ───────────────────────────────
// This interface precisely models the structure of a single worker
// object returned by your API.
export interface Worker {
  node_id: string;
  disk_models: object;
  pinned_memory_pool: object;
  io_queue: any[];
  io_queue_estimated_time_left: number;
  hardware_info: {
    pcie_bandwidth: number;
    disk_size: number;
    disk_bandwidth: number;
    disk_write_bandwidth: number;
    disk_read_bandwidth: number;
    GPUs_info: {
      [key: string]: {
        Name: string;
        Load: string;
        Free_Memory: string;
        Used_Memory: string;
        Total_Memory: string;
      };
    };
  };
  chunk_size: number;
  total_memory_pool_chunks: number;
  used_memory_pool_chunks: number;
  queued_models: object;
}

/* ── Context shape ──────────────────────────────────────────── */
interface ChatCtx {
  chats: Chat[];
  models: Model[];
  workers: Worker[];
  currentChatId: string;
  setCurrentChat: (id: string) => void;
  getModels: () => Promise<void>;
  getWorkers: () => Promise<void>;
  updateChatModel: (chatId: string, modelId: string) => void;
  sendMessage: (chatId: string, userContent: string) => Promise<void>;
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

  const [models, setModels] = useState<Model[]>([]);
  const getModels = useCallback(async () => {
    try {
      const res = await axios.get(`${LLM_SERVER_URL}/v1/models`);
      // Extract just the id and use it for both id and name
      setModels(
        res.data.models.map((model: any) => ({
          id: model.id,
          name: model.id.split("/").pop() || model.id, // Use the last part of ID as name
        })),
      );
    } catch (err) {
      console.error("Failed to fetch models:", err);
      if (!models.length)
        setModels([{ id: "facebook/opt-1.3b", name: "OPT-1.3B" }]);
    }
  }, [models.length]);

  const [workers, setWorkers] = useState<Worker[]>([]);
  // ── 2. getWorkers Function Implementation ──────────────────────
  // This function fetches worker data from the specified endpoint
  // and updates the component's state.
  const getWorkers = useCallback(async () => {
    try {
      const res = await axios.get(`${LLM_SERVER_URL}/v1/workers`);
      // The API returns an object where keys are worker IDs ("0", "1", ...).
      // Object.values() extracts the worker objects into an array.
      const workerArray: Worker[] = Object.values(res.data);
      setWorkers(workerArray);
    } catch (err) {
      console.error("Failed to fetch workers:", err);
    }
  }, []); // No dependencies needed as it's self-contained

  useEffect(() => {
    getModels().catch(console.error);
    getWorkers().catch(console.error); // Initial fetch for workers
  }, []);

  useEffect(() => {
    if (chats.length === 0 && models.length) {
      const firstChat: Chat = {
        id: generateId(),
        title: "New chat",
        model: models[0]?.id || "default-model-id",
        models: models.map((m) => m.id),
        messages: [],
      };
      setChats([firstChat]);
      setCurrentChat(firstChat.id);
    }
  }, [chats.length, models]);

  useEffect(() => {
    // Set up polling for both models and workers
    const modelIntervalId = setInterval(getModels, POLLING_INTERVAL);
    const workerIntervalId = setInterval(getWorkers, WORKER_POLLING_INTERVAL);

    // Cleanup function to clear intervals when the component unmounts
    return () => {
      clearInterval(modelIntervalId);
      clearInterval(workerIntervalId);
    };
  }, [getModels, getWorkers]);

  const updateChatModel = (chatId: string, modelId: string) =>
    setChats((list) =>
      list.map((c) =>
        c.id === chatId
          ? {
              ...c,
              model: modelId,
            }
          : c,
      ),
    );

  const bumpChatModelIfNeeded = (chatId: string, newModel: string) =>
    setChats((list) =>
      list.map((c) => {
        if (c.id !== chatId) return c;
        const updatedModels = c.models.includes(newModel)
          ? c.models
          : [...c.models, newModel];
        return {
          ...c,
          model: newModel,
          models: updatedModels,
        };
      }),
    );

  const appendMessage = (chatId: string, msg: Message) =>
    setChats((list) =>
      list.map((c) =>
        c.id === chatId ? { ...c, messages: [...c.messages, msg] } : c,
      ),
    );

  const renameChat = (id: string, title: string) =>
    setChats((list) => list.map((c) => (c.id === id ? { ...c, title } : c)));

  const deleteChat = (id: string) =>
    setChats((list) => list.filter((c) => c.id !== id));

  /* For fake typing animation */
  const simulationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendMessage = async (chatId: string, userContent: string) => {
    const trimmed = userContent.trim();
    if (!trimmed) return;

    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: trimmed,
      model: chat.model, // Use the model from the current chat
    };

    const chatPayload = [
      { role: "system", content: "You are a helpful assistant." },
      ...toChatFormat(chat.messages), // The history so far
      { role: "user", content: trimmed }, // The new message
    ];

    const assistantPlaceholder: Message = {
      id: generateId(),
      role: "assistant",
      content: "", // Starts empty
      model: chat.model,
    };

    setChats((list) =>
      list.map((c) =>
        c.id === chatId
          ? {
              ...c,
              messages: [...c.messages, userMsg, assistantPlaceholder],
            }
          : c,
      ),
    );

    bumpChatModelIfNeeded(chatId, chat.model);

    try {
      if (simulationTimeoutRef.current)
        clearTimeout(simulationTimeoutRef.current);

      const response = await axios.post(
        `${LLM_SERVER_URL}/v1/chat/completions`,
        {
          model: chat.model,
          messages: chatPayload,
        },
        {
          headers: { "Content-Type": "application/json" },
          proxy: false,
          timeout: TIMEOUT,
        },
      );

      const fullAssistantReply: string =
        response.data.choices[0].message.content;
      await simulateStreamingResponse(
        chatId,
        assistantPlaceholder.id,
        fullAssistantReply,
      );
    } catch (err) {
      console.error(err);
      setChats((list) =>
        list.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantPlaceholder.id
                    ? {
                        ...m,
                        content:
                          "⚠️ Error processing request. Please try again.",
                      }
                    : m,
                ),
              }
            : c,
        ),
      );
    }
  };

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
                    m.id === assistantMsgId
                      ? { ...m, content: botResponse.slice(0, i) }
                      : m,
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

  useEffect(
    () => () => {
      if (simulationTimeoutRef.current)
        clearTimeout(simulationTimeoutRef.current);
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
    workers,
    currentChatId,
    setCurrentChat,
    getModels,
    getWorkers,
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
