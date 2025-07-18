import axios from "axios";
import { LLM_SERVER_URL, TIMEOUT, MAX_TOKENS } from "@/context/constants";
import { Worker, Model, QueueResponse } from "@/context/types";

export const getWorkers = async (): Promise<Worker[]> => {
  const res = await axios.get(
    `${LLM_SERVER_URL}/v1/workers`,
  );
  return Object.values(res.data);
};

export const getModels = async (): Promise<Model[]> => {
  const res = await axios.get<{ models: Model[] }>(
    `${LLM_SERVER_URL}/v1/models`,
  );
  return res.data.models;
};

export const postChatCompletion = async (
  model: string,
  messages: { role: string; content: string }[],
  queryId: string
) => {
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
};

export const getQueryStatus = async (queryId: string) => {
  try {
    const { data } = await axios.get<QueueResponse>(`${LLM_SERVER_URL}/v1/queue`);
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
  } catch (error) {
    console.error(`Failed to get query status for ${queryId}:`, error);
    throw new Error("API call for query status failed");
  }
};

