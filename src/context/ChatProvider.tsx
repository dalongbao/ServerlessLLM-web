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
  getRequestStatus,
  getServerHealth,
} from "@/context/api";
import { NetworkError } from "@/context/errorTypes";
import { useToastContext } from "@/context/ToastProvider";
import {
  POLLING_INTERVAL,
  WORKER_POLLING_INTERVAL,
  QUERY_STATUS_POLLING_INTERVAL,
  HEALTH_POLLING_INTERVAL,
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
  HealthStatus,
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
  const { showConnectionError, showError, removeToast } = useToastContext();
  const [connectionErrorToastId, setConnectionErrorToastId] = useState<string | null>(null);

  const [models, setModels] = useState<Model[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    status: 'unknown',
    message: 'Checking server health...',
    timestamp: Date.now()
  });
  const [processingChats, setProcessingChats] = useState<Set<string>>(new Set());

  usePolling(async () => {
    const raw = await getModels();
    if (raw.length > 0) {
      setModels(
        raw.map((m) => ({
          id: m.id,
          name: m.id.split("/").pop() || m.id,
        }))
      );
    }
    // If empty array returned, keep existing models (server likely offline)
  }, POLLING_INTERVAL);

  usePolling(async () => {
    const workers = await getWorkers();
    if (workers.length > 0) {
      setWorkers(workers);
    }
    // If empty array returned, keep existing workers (server likely offline)
  }, WORKER_POLLING_INTERVAL);

  usePolling(async () => {
    try {
      const health = await getServerHealth();
      setHealthStatus(health);
      
      // Clear connection error toast if server is back online
      if (connectionErrorToastId && (health.status === 'healthy' || health.status === 'degraded')) {
        removeToast(connectionErrorToastId);
        setConnectionErrorToastId(null);
      }
    } catch (error: unknown) {
      console.error('Health check failed:', error);
    }
  }, HEALTH_POLLING_INTERVAL);

  usePolling(async () => {
    // Capture current values at start of polling cycle
    const capturedCurrentChatId = currentChatId;
    let currentChat: Chat | undefined;
    let queryId: string | undefined;
    
    // Get fresh state
    setChats(prevChats => {
      currentChat = prevChats.find(c => c.id === capturedCurrentChatId);
      if (currentChat?.activeQuery) {
        queryId = currentChat.activeQuery.id;
      }
      return prevChats; // No change, just reading state
    });
    
    if (!currentChat?.activeQuery || !queryId) {
      return; 
    }
    
    try {
      const result = await getRequestStatus(queryId);
      
      // If request is completed, clear the active query since server has processed it
      if (result.status === 'completed') {
        setChats(prevChats =>
          prevChats.map(chat => {
            if (chat.id === capturedCurrentChatId && chat.activeQuery?.id === queryId) {
              return {
                ...chat,
                activeQuery: null,
                isActive: false,
              };
            }
            return chat;
          })
        );
        return; // Stop polling this request
      }
      
      setChats(prevChats =>
        prevChats.map(chat => {
          // Use fresh state to validate the update is still relevant
          if (chat.id === capturedCurrentChatId && chat.activeQuery?.id === queryId && chat.activeQuery) {
            return {
              ...chat,
              activeQuery: {
                id: chat.activeQuery.id,
                startTime: chat.activeQuery.startTime,
                model: chat.activeQuery.model,
                status: result.status as QueryStatus,
                queuePosition: null, 
              },
            };
          }
          return chat;
        })
      );
    } catch (error: unknown) {
      if (error instanceof Error && 'type' in error) {
        const networkError = error as NetworkError;
        console.warn(`Failed to poll status for chat ${capturedCurrentChatId}:`, networkError.userMessage);
        
        // Only cancel the query if it's not a temporary network issue
        if (networkError.type === 'CONNECTION_FAILED') {
          if (!connectionErrorToastId) {
            const toastId = showConnectionError(
              'Connection Lost',
              'Lost connection while processing your request. Please check your internet connection.'
            );
            setConnectionErrorToastId(toastId);
          }
          
          setChats(prevChats =>
            prevChats.map(chat => {
              if (chat.id === capturedCurrentChatId && chat.activeQuery?.id === queryId) {
                return { 
                  ...chat, 
                  isActive: false, 
                  activeQuery: null,
                  messages: chat.messages.map(m =>
                    m.role === 'assistant' && m.content === ''
                      ? { ...m, content: '⚠️ Connection lost while processing. Please try again.', include: false }
                      : m
                  )
                }; 
              }
              return chat;
            })
          );
        }
      } else {
        console.error(`Failed to poll status for chat ${capturedCurrentChatId}:`, error);
        setChats(prevChats =>
          prevChats.map(chat => {
            if (chat.id === capturedCurrentChatId && chat.activeQuery?.id === queryId) {
              return { ...chat, isActive: false, activeQuery: null }; 
            }
            return chat;
          })
        );
      }
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
      let timeoutId: NodeJS.Timeout | null = null;
      let cancelled = false;
      
      const tick = () => {
        // Check if chat still exists and is active before updating
        setChats((prevChats) => {
          const chat = prevChats.find(c => c.id === chatId);
          if (!chat || !chat.isActive || cancelled) {
            // Chat was cancelled or doesn't exist anymore
            cancelled = true;
            if (timeoutId) clearTimeout(timeoutId);
            resolve();
            return prevChats;
          }
          
          return prevChats.map((c) =>
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
          );
        });
        
        if (!cancelled && i < text.length) {
          i++;
          timeoutId = setTimeout(tick, SERVER_WAITTIME);
        } else if (!cancelled) {
          resolve();
        }
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
    async (chatId: string, userContent: string, retryCount = 0) => {
      const trimmed = userContent.trim();
      if (!trimmed) return;
      
      // Check server health before sending
      if (healthStatus.status === 'unhealthy') {
        console.warn('Cannot send message: Server is unavailable');
        throw new Error(`Server is unavailable: ${healthStatus.message}`);
      }
      
      // Check if this chat is already processing a message
      if (processingChats.has(chatId)) {
        console.warn('Message already being processed for this chat');
        throw new Error('Another message is already being processed for this chat');
      }
      
      // Mark chat as processing
      setProcessingChats(prev => new Set(prev.add(chatId)));
      
      const userId = generateId();
      const assistantId = `chatcmpl-${generateId()}`;

      // Find the chat and get its model
      const currentChat = chats.find(c => c.id === chatId);
      if (!currentChat) {
        setProcessingChats(prev => {
          const next = new Set(prev);
          next.delete(chatId);
          return next;
        });
        throw new Error("Chat not found");
      }

      const modelForThisMessage = currentChat.model;
      
      // Add user message and empty assistant message to UI
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
      
      const initialQuery: ActiveQuery = { 
        id: assistantId, 
        status: "QUEUED", 
        startTime: Date.now(), 
        model: modelForThisMessage, 
        queuePosition: null, 
      };

      setChats(prevChats =>
        prevChats.map(c => 
          c.id === chatId 
            ? {
                ...c,
                messages: [...c.messages, userMsg, assistantMsg],
                isActive: true,
                models: [...new Set([...(c.models || []), modelForThisMessage])],
                activeQuery: initialQuery,
              }
            : c
        )
      );

      const timeoutId = setTimeout(() => {
        console.warn(`Request for chat ${chatId} timed out.`);
        cancelQuery(chatId, 'timeout');
      }, REQUEST_TIMEOUT);

      try {
        // Get current chat messages for context
        const updatedChat = chats.find(c => c.id === chatId);
        if (!updatedChat) {
          throw new Error("Chat not found after being set.");
        }

        const includedMessages = updatedChat.messages.filter(message => message.include !== false);
        const history = [
          { role: "system", content: SYSTEM_PROMPT },
          ...toChatFormat(includedMessages),
        ];

        // Make the API call
        const reply = await postChatCompletion(modelForThisMessage, history, assistantId);
        console.log('Received reply:', reply);
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

      } catch (e: unknown) {
        clearTimeout(timeoutId);
        
        let errorMessage = "⚠️ Error processing request. Please try again.";
        
        if (e instanceof Error && 'type' in e) {
          const networkError = e as NetworkError;
          console.error("Failed to get chat completion:", networkError.userMessage);
          
          switch (networkError.type) {
            case 'CONNECTION_FAILED':
              // Retry connection failures up to 2 times with exponential backoff
              if (retryCount < 2) {
                console.log(`Retrying message send (attempt ${retryCount + 1}/3) after connection failure...`);
                const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
                setTimeout(() => {
                  sendMessage(chatId, userContent, retryCount + 1).catch(console.error);
                }, delay);
                return; // Don't show error yet, we're retrying
              }
              
              errorMessage = "⚠️ Cannot connect to server. Check your internet connection and try again.";
              if (!connectionErrorToastId) {
                const toastId = showConnectionError(
                  'Connection Failed',
                  'Unable to connect to the server after multiple attempts. Please check your internet connection and try again.'
                );
                setConnectionErrorToastId(toastId);
              }
              break;
            case 'TIMEOUT':
              errorMessage = "⚠️ Request timed out. The server is taking too long to respond.";
              showError('Request Timeout', 'The server is taking too long to respond. Please try again.');
              break;
            case 'SERVER_ERROR':
              errorMessage = "⚠️ Server error occurred. Please try again later.";
              showError('Server Error', 'The server encountered an error. Please try again later.');
              break;
            default:
              errorMessage = networkError.userMessage;
              showError('Request Failed', networkError.userMessage);
              break;
          }
        } else {
          console.error("Failed to get chat completion:", e);
        }
        
        setChats((prevChats) =>
          prevChats.map((c) => {
            if (c.id === chatId) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: errorMessage, include: false}
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
        // Clean up processing state
        setProcessingChats(prev => {
          const next = new Set(prev);
          next.delete(chatId);
          return next;
        });
        
        setChats(prevChats =>
          prevChats.map(c =>
            c.id === chatId && c.isActive 
              ? { ...c, isActive: false, activeQuery: null }
              : c
          )
        );
      }
    },
    [cancelQuery, healthStatus, processingChats, connectionErrorToastId, showConnectionError, showError] 
  );  

  const renameChat = (id: string, newTitle: string) => {
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === id ? { ...chat, title: newTitle } : chat
      )
    );
  };

  const deleteChat = (id: string) => {
    setChats((prevChats) => {
      const chatToDeleteIndex = prevChats.findIndex((chat) => chat.id === id);
      const newChats = prevChats.filter((chat) => chat.id !== id);

      if (currentChatId === id) {
        if (newChats.length > 0) {
          const newCurrentChatIndex = Math.max(0, chatToDeleteIndex - 1);
          setCurrentChat(newChats[newCurrentChatIndex].id);
        } else {
          setCurrentChat("");
        }
      }

      return newChats;
    });
  };

  const value: ChatCtx = {
    chats,
    models,
    workers,
    currentChatId,
    healthStatus,
    setCurrentChat,
    cancelQuery,
    getModels: async () => {
      const raw = await getModels();
      if (raw.length > 0) {
        setModels(
          raw.map((m) => ({
            id: m.id,
            name: m.id.split("/").pop() || m.id,
          }))
        );
      }
      // If empty array returned, keep existing models (server likely offline)
    },
    getWorkers: async () => {
      const workers = await getWorkers();
      if (workers.length > 0) {
        setWorkers(workers);
      }
      // If empty array returned, keep existing workers (server likely offline)
    },
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
    deleteChat, 
    renameChat,
  };

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
}
