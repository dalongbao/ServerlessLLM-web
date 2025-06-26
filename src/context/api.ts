import axios from "axios";
import { LLM_SERVER_URL, TIMEOUT } from "@/context/constants";
import { Message, Worker, Model, QueryStatus } from "@/context/types";

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
  messages: { role: string; content: string }[]
) => {
  const res = await axios.post(
    `${LLM_SERVER_URL}/v1/chat/completions`,
    { model, messages },
    { timeout: TIMEOUT, proxy: false }
  );
  return res.data.choices[0].message.content as string;
};

export const getQueryStatus = async (queryId: string) => {
  // try {
  //   const { data } = await axios.get(`${LLM_SERVER_URL}/v1/query/${queryId}`);
  //   return data;
  // } catch (error) {
  //   console.error("Failed to get query status:", error);
  //   throw new Error("API call for query status failed");
  // }

  // Mock response for demonstration:
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        status: 'INFERENCE',
        queue_position: null,
      });
    }, 2500); // Simulate a ~2.5 second queue time before switching to INFERENCE
  });
}
