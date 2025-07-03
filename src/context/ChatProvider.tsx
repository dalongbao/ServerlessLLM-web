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
  REQUEST_TIMEOUT,
} from "@/context/constants";
import { restoreChats, persistChats } from "@/context/storage";
import {
  ActiveQuery,
  Chat,
  ChatCtx,
  Message,
  Model,
  Worker,
  QueryStatus,
} from "@/context/types";
import { generateId, toChatFormat } from "@/context/helpers";
import { usePolling } from "@/context/usePolling";

const ChatContext = createContext<ChatCtx | null>(null);
export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};

export function ChatProvider({ children }: { children: ReactNode }) { 
  const { chats: restored, id: restoredId } = restoreChats();
  const [chats, setChats] = useState<Chat[]>(restored);
  const [currentChatId, setCurrentChat] = useState<string>(
    restoredId ?? ""
  );

  const [models, setModels] = useState<Model[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  usePolling(async () => {
    const raw = await getModels();
    setModels(
      raw.map((m) => ({
        id: m.id,
        name: m.id.split("/").pop() || m.id,
      }))
    );
  }, POLLING_INTERVAL);

  usePolling(() => getWorkers().then(setWorkers), WORKER_POLLING_INTERVAL);

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
                status: result.status as QueryStatus,
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

  useEffect(() => {
    if (chats.length === 0 && models.length > 0) {
      const first: Chat = {
        id: generateId(),
        title: "New chat",
        model: models[0].id,
        models: [],
        messages: [],
        isActive: false,
        activeQuery: null,
      };
      setChats([first]);
      setCurrentChat(first.id);
    }
  }, [chats.length, models]);

  useEffect(
    () => persistChats(chats, currentChatId),
    [chats, currentChatId]
  );

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

  const cancelQuery = useCallback((chatId: string, reason: 'cancelled' | 'timeout') => {
    setChats(prevChats =>
      prevChats.map(chat => {
        if (chat.id === chatId && chat.isActive) {
          const lastMessage = chat.messages[chat.messages.length - 1];
          const messageContent =
            reason === 'timeout'
              ? "⚠️ Request timed out. The server is taking too long to respond. Please try again."
              : "🚫 Request cancelled by user.";

          if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content === '') {
            return {
              ...chat,
              isActive: false,
              activeQuery: null,
              messages: chat.messages.map(m =>
                m.id === lastMessage.id
                  ? { ...m, content: messageContent, include: false}
                  : m
              ),
            };
          }
        }
        return chat;
      })
    );
  }, []);

  const sendMessage = useCallback(
    async (chatId: string, userContent: string) => {
      const trimmed = userContent.trim();
      if (!trimmed) return;
      
      const userId = generateId();
      const assistantId = generateId();

      const chatForModel = chats.find(c => c.id === chatId);
      if (!chatForModel) return;
      const modelForThisMessage = chatForModel.model;

      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c.id === chatId) {
            const initialQuery: ActiveQuery = { 
              id: assistantId, 
              status: "QUEUED", 
              startTime: Date.now(), 
              model: modelForThisMessage, 
              queuePosition: null, 
            };
            const userMsg: Message = { 
              id: userId, 
              role: "user", 
              content: trimmed, 
              model: modelForThisMessage, 
              include: true
            };
            const assistantMsg: Message = { 
              id: assistantId, 
              role: "assistant", 
              content: "", 
              model: modelForThisMessage, 
              include: true
            };
            return {
              ...c,
              messages: [...c.messages, userMsg, assistantMsg],
              isActive: true,
              models: [...new Set([...(c.models || []), modelForThisMessage])],
              activeQuery: initialQuery,
            };
          }
          return c;
        })
      );

      const timeoutId = setTimeout(() => {
        console.warn(`Request for chat ${chatId} timed out.`);
        cancelQuery(chatId, 'timeout');
      }, REQUEST_TIMEOUT);

      try {
        const currentChat = chats.find(c => c.id === chatId);
        if (!currentChat) throw new Error("Chat not found after being set.");
        const includedMessages = currentChat.messages.filter(
          (message) => message.include !== false
        );

        const history = [
          { role: "system", content: SYSTEM_PROMPT },
          ...toChatFormat(includedMessages), 
          { role: "user", content: trimmed },
        ];

        const reply = await postChatCompletion(modelForThisMessage, history, assistantId);
        clearTimeout(timeoutId);

        let wasCancelled = false;
        setChats(prevChats => {
            const upToDateChat = prevChats.find(c => c.id === chatId);
            if (!upToDateChat?.isActive) {
                wasCancelled = true;
                console.log("Query was cancelled or timed out before response arrived. Ignoring response.");
                return prevChats; 
            }
            return prevChats;
        });

        if (wasCancelled) return;

        await simulateStreamingResponse(chatId, assistantId, reply);

      } catch (e) {
        clearTimeout(timeoutId);
        console.error("Failed to get chat completion:", e);
        setChats((prevChats) =>
          prevChats.map((c) => {
            if (c.id === chatId) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: "⚠️ Error processing request. Please try again.", include: false}
                    : m
                ),
                isActive: false,
                activeQuery: null,
              }
            }
            return c;
          })
        );
      } finally {
        setChats(prevChats =>
          prevChats.map(c =>
            c.id === chatId && c.isActive 
              ? { ...c, isActive: false, activeQuery: null }
              : c
          )
        );
      }
    },
    [chats, cancelQuery] 
  );  

  const value: ChatCtx = {
    chats,
    models,
    workers,
    currentChatId,
    setCurrentChat,
    cancelQuery,
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
