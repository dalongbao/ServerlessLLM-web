import { STORAGE_KEY, ID_KEY } from "@/context/constants";
import { Chat } from "./types";

export function restoreChats() {
  try {
    const chats = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Chat[];
    const id = localStorage.getItem(ID_KEY);
    return { chats, id };
  } catch {
    return { chats: [], id: null };
  }
}

export function persistChats(chats: Chat[], id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    localStorage.setItem(ID_KEY, id);
  } catch (e) {
    console.warn("Unable to save chat history:", e);
  }
}
