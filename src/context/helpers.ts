import { Message } from "./types";

export const generateId = () => crypto.randomUUID();

export const toChatFormat = (msgs: Message[]) =>
  msgs.map(({ role, content }) => ({ role, content }));
