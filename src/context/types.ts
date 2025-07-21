export type QueryStatus = 'IDLE' | 'QUEUED' | 'INFERENCE' | 'ERROR';

export interface ActiveQuery {
  id: string;
  status: QueryStatus;
  startTime: number; 
  model: string;
  queuePosition: number | null;
}
export interface Chat {
  id: string;
  title: string;
  model: string;
  models: string[];
  messages: Message[];
  isActive: boolean;
  activeQuery: ActiveQuery | null;
}
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  model?: string;
  content: string;
  include: boolean;
}
export interface Model {
  id: string;
  name: string;
}
export interface Worker {
  node_id: string;
  disk_models: object;
  pinned_memory_pool: object;
  io_queue: string[];
  hardware_info: {
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
  status: boolean;
}
export interface ChatCtx {
  chats: Chat[];
  models: Model[];
  workers: Worker[];
  currentChatId: string;
  healthStatus: HealthStatus;
  setCurrentChat: (id: string) => void;
  getModels: () => Promise<void>;
  getWorkers: () => Promise<void>;
  updateChatModel: (chatId: string, modelId: string) => void;
  sendMessage: (chatId: string, userContent: string, retryCount?: number) => Promise<void>;
  cancelQuery: (chatId: string, reason: "cancelled" | "timeout") => void;
  addChat: (chat: Chat) => void;
  renameChat: (id: string, newTitle: string) => void;
  deleteChat: (id: string) => void;
}
export interface QueueItem {
  query_id: string;
  status: string;
  overall_queue_position: number;
}
export interface QueueResponse {
  work_queue: QueueItem[];
}

export type ServerHealth = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthStatus {
  status: ServerHealth;
  message?: string;
  timestamp: number;
}
