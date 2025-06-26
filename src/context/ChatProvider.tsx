"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  getModels,
  getWorkers,
  postChatCompletion,
  getQueryStatus,
} from "@/context/api";
import {
  POLLING_INTERVAL,
  WORKER_POLLING_INTERVAL,
  QUERY_STATUS_POLLING_INTERVAL,
  SERVER_WAITTIME,
  SYSTEM_PROMPT,
} from "@/context/constants";
import { restoreChats, persistChats } from "@/context/storage";
import {
  ActiveQuery,
  Chat,
  ChatCtx,
  Message,
  Model,
  QueryStatus,
  Worker,
} from "@/context/types";
import { generateId, toChatFormat } from "@/context/helpers";
import { usePolling } from "@/context/usePolling";

/* ── Context plumbing ───────────────────────────────────────── */
const ChatContext = createContext<ChatCtx | null>(null);
export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};

/* ── Provider ───────────────────────────────────────────────── */
export function ChatProvider({ children }: { children: ReactNode }) {
  /* Load persisted data */
  const { chats: restored, id: restoredId } = restoreChats();
  const [chats, setChats] = useState<Chat[]>(restored);
  const [currentChatId, setCurrentChat] = useState<string>(
    restoredId ?? ""
  );

  /* Remote state */
  const [models, setModels] = useState<Model[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  /* Polling */
  // Models polling
  usePolling(async () => {
    const raw = await getModels();
    setModels(
      raw.map((m) => ({
        id: m.id,
        name: m.id.split("/").pop() || m.id,
      }))
    );
  }, POLLING_INTERVAL);

  // Workers polling
  usePolling(() => getWorkers().then(setWorkers), WORKER_POLLING_INTERVAL);

  // Query status polling
usePolling(async () => {
    const currentChat = chats.find(c => c.id === currentChatId);
    if (!currentChat?.activeQuery) {
      return; 
    }
    try {
      const result = await getQueryStatus(currentChat.activeQuery.id);
      setChats(prevChats =>
        prevChats.map(chat => {
          if (chat.id === currentChatId && chat.activeQuery) {
            return {
              ...chat,
              activeQuery: {
                ...chat.activeQuery,
                status: result.status,
                queuePosition: result.queue_position,
              },
            };
          }
          return chat;
        })
      );
    } catch (error) {
      console.error(`Failed to poll status for chat ${currentChat.id}:`, error);
      setChats(prevChats =>
        prevChats.map(chat => {
          if (chat.id === currentChatId) {
            return { ...chat, isActive: false, activeQuery: null }; 
          }
          return chat;
        })
      );
    }
  }, QUERY_STATUS_POLLING_INTERVAL);

  /* Init first chat if none */
  useEffect(() => {
    if (chats.length === 0 && models.length) {
      const first: Chat = {
        id: generateId(),
        title: "New chat",
        model: models[0].id,
        models: models.map((m) => m.id),
        messages: [],
        isActive: false,
        activeQuery: null,
      };
      setChats([first]);
      setCurrentChat(first.id);
    }
  }, [chats.length, models]);

  /* Persist on change */
  useEffect(
    () => persistChats(chats, currentChatId),
    [chats, currentChatId]
  );

  /* Fake-typing helper */
  const simulateStreamingResponse = (
    chatId: string,
    assistantMsgId: string,
    text: string
  ) =>
    new Promise<void>((resolve) => {
      let i = 0;
      const tick = () => {
        setChats((prevChats) =>
          prevChats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: text.slice(0, i) }
                      : m
                  ),
                }
              : c
          )
        );
        if (i < text.length) {
          i++;
          setTimeout(tick, SERVER_WAITTIME);
        } else resolve();
      };
      tick();
    });

  /* ── sendMessage ────────────────────────────────────────── */
  const sendMessage = useCallback(
    async (chatId: string, userContent: string) => {
      const trimmed = userContent.trim();
      if (!trimmed) return;

      const assistantId = generateId();
      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: trimmed,
      };
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c.id === chatId) {
            const initialQuery: ActiveQuery = {
              id: assistantId,
              status: "QUEUED",
              startTime: Date.now(),
              model: c.model,
              queuePosition: null,
            };
            return {
              ...c,
              messages: [...c.messages, userMsg, assistantMsg],
              isActive: true,
              activeQuery: initialQuery,
            };
          }
          return c;
        })
      );

      try {
        const currentChat = chats.find(c => c.id === chatId);
        if (!currentChat) return; // Should not happen, but good practice

        const history = [
          { role: "system", content: SYSTEM_PROMPT },
          ...toChatFormat(currentChat.messages), 
          { role: "user", content: trimmed },
        ];

        const reply = await postChatCompletion(currentChat.model, history);
        await simulateStreamingResponse(chatId, assistantId, reply);

      } catch (e) {
        console.error("Failed to get chat completion:", e);
        setChats((prevChats) =>
          prevChats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content: "⚠️ Error processing request. Please try again.",
                        }
                      : m
                  ),
                }
              : c
          )
        );
      } finally {
        setChats((prevChats) =>
          prevChats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  isActive: false,
                  activeQuery: null, 
                }
              : c
          )
        );
      }
    },
    [] 
  );

  /* ── value ────────────────────────────────────────────────── */
  const value: ChatCtx = {
    chats,
    models,
    workers,
    currentChatId,
    setCurrentChat,
    getModels: async () => setModels(await getModels()),
    getWorkers: async () => setWorkers(await getWorkers()),
    updateChatModel: (chatId, modelId) =>
      setChats((xs) =>
        xs.map((c) =>
          c.id === chatId ? { ...c, model: modelId } : c
        )
      ),
    sendMessage,
    addChat: (chat) => {
      setChats((xs) => [...xs, chat]);
      setCurrentChat(chat.id);
    },
    renameChat: (id, title) =>
      setChats((xs) =>
        xs.map((c) => (c.id === id ? { ...c, title } : c))
      ),
    deleteChat: (id) =>
      setChats((xs) => xs.filter((c) => c.id !== id)),
  };

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
}
