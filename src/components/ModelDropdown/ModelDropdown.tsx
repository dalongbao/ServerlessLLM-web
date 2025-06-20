"use client";
import { useChat } from '@/context/ChatProvider';

export default function ModelDropdown() {
  const { models, chats, currentChatId } = useChat();
  const active = chats.find(c => c.id === currentChatId);
  if (!active) return null;
  return (
    <select
      className="absolute left-2 top-2 rounded bg-white/80 p-1 text-sm"
      value={active.model}
      // onChange={(e) => /* update active.model later */ }
    >
      {models.map(m => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}
