import axios from "axios";
import { LLM_SERVER_URL, TIMEOUT, MAX_TOKENS } from "@/context/constants";
import { Worker, Model, QueueResponse, HealthStatus } from "@/context/types";
import { categorizeAxiosError } from "@/context/errorTypes";

// Import dummy data
import dummyModels from "@/dummy/models.json";

// Check if we should use dummy data
const USE_DUMMY_DATA = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';

export const getWorkers = async (): Promise<Worker[]> => {
  if (USE_DUMMY_DATA) {
    // Return dummy workers data
    return [
      { 
        node_id: "worker-1", 
        status: true, 
        disk_models: {},
        pinned_memory_pool: {},
        io_queue: [],
        hardware_info: {
          GPUs_info: {
            "0": {
              Name: "NVIDIA A100",
              Load: "50%",
              Free_Memory: "40GB",
              Used_Memory: "40GB",
              Total_Memory: "80GB"
            }
          }
        },
        chunk_size: 1024,
        total_memory_pool_chunks: 100,
        used_memory_pool_chunks: 50,
        queued_models: {}
      },
      { 
        node_id: "worker-2", 
        status: true, 
        disk_models: {},
        pinned_memory_pool: {},
        io_queue: [],
        hardware_info: {
          GPUs_info: {
            "0": {
              Name: "NVIDIA V100",
              Load: "30%",
              Free_Memory: "25GB",
              Used_Memory: "7GB",
              Total_Memory: "32GB"
            }
          }
        },
        chunk_size: 1024,
        total_memory_pool_chunks: 80,
        used_memory_pool_chunks: 20,
        queued_models: {}
      },
      { 
        node_id: "worker-3", 
        status: true, 
        disk_models: {},
        pinned_memory_pool: {},
        io_queue: [],
        hardware_info: {
          GPUs_info: {
            "0": {
              Name: "NVIDIA V100",
              Load: "30%",
              Free_Memory: "25GB",
              Used_Memory: "7GB",
              Total_Memory: "32GB"
            }
          }
        },
        chunk_size: 1024,
        total_memory_pool_chunks: 80,
        used_memory_pool_chunks: 20,
        queued_models: {}
      },
      { 
        node_id: "worker-4", 
        status: true, 
        disk_models: {},
        pinned_memory_pool: {},
        io_queue: [],
        hardware_info: {
          GPUs_info: {
            "0": {
              Name: "NVIDIA V100",
              Load: "30%",
              Free_Memory: "25GB",
              Used_Memory: "7GB",
              Total_Memory: "32GB"
            }
          }
        },
        chunk_size: 1024,
        total_memory_pool_chunks: 80,
        used_memory_pool_chunks: 20,
        queued_models: {}
      },
    ];
  }

  try {
    const res = await axios.get(
      `${LLM_SERVER_URL}/v1/workers`,
      { timeout: 10000 }
    );
    return Object.values(res.data);
  } catch (error: unknown) {
    const networkError = categorizeAxiosError(error);
    console.error('Failed to get workers:', networkError.userMessage);
    throw networkError;
  }
};

export const getModels = async (): Promise<Model[]> => {
  if (USE_DUMMY_DATA) {
    // Return dummy models data
    return dummyModels;
  }

  try {
    const res = await axios.get<{ models: Model[] }>(
      `${LLM_SERVER_URL}/v1/models`,
      { timeout: 10000 }
    );
    return res.data.models;
  } catch (error: unknown) {
    const networkError = categorizeAxiosError(error);
    console.error('Failed to get models:', networkError.userMessage);
    throw networkError;
  }
};

export const postChatCompletion = async (
  model: string,
  messages: { role: string; content: string }[],
  queryId: string
) => {
  if (USE_DUMMY_DATA) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Generate a dummy response based on the user's message
    const userMessage = messages[messages.length - 1]?.content || "";
    const dummyResponses = [
      `I understand you said: "${userMessage}". This is a dummy response from the ${model} model.`,
      `That's an interesting question about "${userMessage}". In dummy mode, I can provide simulated responses.`,
      `Thanks for asking about "${userMessage}". This response is generated locally without connecting to a real AI model.`,
      `I see you mentioned "${userMessage}". This is a test response from the dummy backend.`,
      `Regarding "${userMessage}" - this is a placeholder response while using dummy data.`
    ];
    
    return dummyResponses[Math.floor(Math.random() * dummyResponses.length)];
  }

  try {
    const res = await axios.post(
      `${LLM_SERVER_URL}/v1/chat/completions`,
      { 
        id: queryId, 
        model, 
        messages,
        max_tokens: MAX_TOKENS 
      },
      { timeout: TIMEOUT, proxy: false }
    );
    return res.data.choices[0].message.content as string;
  } catch (error: unknown) {
    const networkError = categorizeAxiosError(error);
    console.error('Failed to post chat completion:', networkError.userMessage);
    throw networkError;
  }
};

export const getQueryStatus = async (queryId: string) => {
  if (USE_DUMMY_DATA) {
    // Simulate query progression
    const randomStatus = Math.random();
    if (randomStatus < 0.3) {
      return { status: 'QUEUED', queue_position: Math.floor(Math.random() * 5) + 1 };
    } else if (randomStatus < 0.6) {
      return { status: 'PROCESSING', queue_position: null };
    } else {
      return { status: 'COMPLETED', queue_position: null };
    }
  }

  try {
    const { data } = await axios.get<QueueResponse>(
      `${LLM_SERVER_URL}/v1/queue`,
      { timeout: 10000 }
    );
    const workQueue = data.work_queue;
    const queueItem = workQueue.find(item => item.query_id === queryId);
    if (queueItem) {
      return {
        status: queueItem.status,
        queue_position: queueItem.overall_queue_position,
      };
    } else {
      return {
        status: 'QUEUED',
        queue_position: null,
      };
    }
  } catch (error: unknown) {
    const networkError = categorizeAxiosError(error);
    console.error(`Failed to get query status for ${queryId}:`, networkError.userMessage);
    throw networkError;
  }
};

export const getServerHealth = async (): Promise<HealthStatus> => {
  if (USE_DUMMY_DATA) {
    // Always return healthy status in dummy mode
    return {
      status: 'healthy',
      message: 'Dummy backend is running - 2/2 workers healthy',
      timestamp: Date.now()
    };
  }

  try {
    const startTime = Date.now();
    
    // Try to get workers and models to assess health
    const [workersResponse, modelsResponse] = await Promise.allSettled([
      axios.get(`${LLM_SERVER_URL}/v1/workers`, { timeout: 5000 }),
      axios.get(`${LLM_SERVER_URL}/v1/models`, { timeout: 5000 })
    ]);
    
    const responseTime = Date.now() - startTime;
    
    // Check if both requests succeeded
    const workersOk = workersResponse.status === 'fulfilled';
    const modelsOk = modelsResponse.status === 'fulfilled';
    
    // Handle network connection failures
    if (!workersOk && !modelsOk) {
      const workersError = workersResponse.status === 'rejected' ? workersResponse.reason : null;
      const modelsError = modelsResponse.status === 'rejected' ? modelsResponse.reason : null;
      
      // Check if it's a network connection issue
      const wErr = workersError as Record<string, unknown>;
      const mErr = modelsError as Record<string, unknown>;
      if (wErr?.code === 'ECONNREFUSED' || wErr?.code === 'ENOTFOUND' ||
          mErr?.code === 'ECONNREFUSED' || mErr?.code === 'ENOTFOUND') {
        return {
          status: 'unhealthy',
          message: 'Cannot connect to server - check your internet connection',
          timestamp: Date.now()
        };
      }
      
      if (wErr?.code === 'ECONNABORTED' || mErr?.code === 'ECONNABORTED') {
        return {
          status: 'unhealthy',
          message: 'Server connection timed out',
          timestamp: Date.now()
        };
      }
      
      return {
        status: 'unhealthy',
        message: 'Server is not responding',
        timestamp: Date.now()
      };
    }
    
    if (!workersOk || !modelsOk) {
      const failedError = !workersOk ? 
        (workersResponse.status === 'rejected' ? workersResponse.reason : null) :
        (modelsResponse.status === 'rejected' ? modelsResponse.reason : null);
        
      const fErr = failedError as Record<string, unknown>;
      if (fErr?.code === 'ECONNREFUSED' || fErr?.code === 'ENOTFOUND') {
        return {
          status: 'degraded',
          message: 'Partial connection issues - some services unavailable',
          timestamp: Date.now()
        };
      }
      
      return {
        status: 'degraded',
        message: 'Some services are not responding',
        timestamp: Date.now()
      };
    }
    
    // Check response time and worker availability
    if (responseTime > 10000) {
      return {
        status: 'degraded',
        message: 'Server is responding slowly',
        timestamp: Date.now()
      };
    }
    
    // Check if any workers are available
    const workers = Object.values(workersResponse.value.data) as Worker[];
    const healthyWorkers = workers.filter(w => w.status === true);
    
    if (healthyWorkers.length === 0) {
      return {
        status: 'unhealthy',
        message: 'No healthy workers available',
        timestamp: Date.now()
      };
    }
    
    if (healthyWorkers.length < workers.length * 0.5) {
      return {
        status: 'degraded',
        message: `Only ${healthyWorkers.length}/${workers.length} workers healthy`,
        timestamp: Date.now()
      };
    }
    
    return {
      status: 'healthy',
      message: `${healthyWorkers.length}/${workers.length} workers healthy`,
      timestamp: Date.now()
    };
    
  } catch (error: unknown) {
    console.error('Health check failed:', error);
    
    const err = error as Record<string, unknown>;
    // Categorize the error for better user messaging
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ENETUNREACH') {
      return {
        status: 'unhealthy',
        message: 'Cannot connect to server - check your internet connection',
        timestamp: Date.now()
      };
    }
    
    if (err.code === 'ECONNABORTED' || (typeof err.message === 'string' && err.message.includes('timeout'))) {
      return {
        status: 'unhealthy',
        message: 'Server connection timed out',
        timestamp: Date.now()
      };
    }
    
    return {
      status: 'unknown',
      message: 'Health check failed - connection issues detected',
      timestamp: Date.now()
    };
  }
};

