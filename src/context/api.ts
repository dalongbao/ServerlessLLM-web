import axios from "axios";
import { LLM_SERVER_URL, TIMEOUT, MAX_TOKENS } from "@/context/constants";
import { Worker, Model, HealthStatus } from "@/context/types";
import { categorizeAxiosError } from "@/context/errorTypes";

export const getWorkers = async (): Promise<Worker[]> => {
  try {
    const res = await axios.get(
      `${LLM_SERVER_URL}/v1/workers`,
      { timeout: 10000 }
    );
    return res.data.data;
  } catch {
    // Silently handle server offline/connection errors
    return [];
  }
};

export const getModels = async (): Promise<Model[]> => {
  try {
    const res = await axios.get(
      `${LLM_SERVER_URL}/v1/models`,
      { timeout: 10000 }
    );
    return res.data.data;
  } catch {
    // Silently handle server offline/connection errors
    return [];
  }
};

export const postChatCompletion = async (
  model: string,
  messages: { role: string; content: string }[],
  queryId: string
) => {
  try {
    const res = await axios.post(
      `${LLM_SERVER_URL}/v1/chat/completions`,
      { 
        task_id: queryId, 
        model, 
        messages,
        max_tokens: MAX_TOKENS 
      },
      { timeout: TIMEOUT, proxy: false }
    );
    
    console.log('Chat completion response:', res.data);
    
    // Handle different possible response formats
    if (res.data.choices && res.data.choices[0] && res.data.choices[0].message) {
      return (res.data.choices[0].message.content as string).trim();
    } else if (res.data.content) {
      return (res.data.content as string).trim();
    } else if (res.data.message) {
      return (res.data.message as string).trim();
    } else if (typeof res.data === 'string') {
      return res.data.trim();
    } else {
      console.error('Unexpected response format:', res.data);
      return JSON.stringify(res.data);
    }
  } catch (error: unknown) {
    const networkError = categorizeAxiosError(error);
    console.error('Failed to post chat completion:', networkError.userMessage);
    throw networkError;
  }
};

export const getRequestStatus = async (requestId: string) => {
  try {
    const { data } = await axios.get(
      `${LLM_SERVER_URL}/v1/status/${requestId}`,
      { timeout: 10000 }
    );
    return {
      status: data.status,
      request_id: data.request_id,
    };
  } catch (error: unknown) {
    const networkError = categorizeAxiosError(error);
    
    // If 404, the request has expired or completed - return completed status
    if (networkError.type === 'SERVER_ERROR' && error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response: { status: number } };
      if (axiosError.response.status === 404) {
        return {
          status: 'completed',
          request_id: requestId,
        };
      }
    }
    
    console.error(`Failed to get request status for ${requestId}:`, networkError.userMessage);
    throw networkError;
  }
};

export const getServerHealth = async (): Promise<HealthStatus> => {
  try {
    const startTime = Date.now();
    
    // Use the dedicated /health endpoint first
    const healthResponse = await axios.get(
      `${LLM_SERVER_URL}/health`,
      { timeout: 5000 }
    );
    
    if (healthResponse.data.status === 'ok') {
      // If health endpoint is ok, check workers for detailed status
      const [workersResponse] = await Promise.allSettled([
        axios.get(`${LLM_SERVER_URL}/v1/workers`, { timeout: 5000 })
      ]);
      
      const responseTime = Date.now() - startTime;
      const workersOk = workersResponse.status === 'fulfilled';
      
      // Check response time
      if (responseTime > 10000) {
        return {
          status: 'degraded',
          message: 'Server is responding slowly',
          timestamp: Date.now()
        };
      }
      
      // Check worker availability if workers endpoint succeeded
      if (workersOk) {
        const workers = workersResponse.value.data.data as Worker[];
        const readyWorkers = workers.filter(w => w.status === 'ready');
        
        if (readyWorkers.length === 0) {
          return {
            status: 'unhealthy',
            message: 'No ready workers available',
            timestamp: Date.now()
          };
        }
        
        if (readyWorkers.length < workers.length * 0.5) {
          return {
            status: 'degraded',
            message: `Only ${readyWorkers.length}/${workers.length} workers ready`,
            timestamp: Date.now()
          };
        }
        
        return {
          status: 'healthy',
          message: `${readyWorkers.length}/${workers.length} workers ready`,
          timestamp: Date.now()
        };
      }
      
      return {
        status: 'healthy',
        message: 'Server is healthy',
        timestamp: Date.now()
      };
    }
    
    return {
      status: 'unhealthy',
      message: 'Health check endpoint returned non-ok status',
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

