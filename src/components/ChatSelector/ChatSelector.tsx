"use client";

import React, { useRef, useEffect, useState } from "react";
import { useChat } from "@/context/ChatProvider";
import { useChatSelector } from "./useChatSelector";
import { Chat } from "@/context/types";
import ModelTicker from "./ModelTicker";
import ChatOptions from "./ChatOptions";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

const mod = (n: number, m: number) => ((n % m) + m) % m;

const ChatTitle = ({ chat, isRenaming, setRenamingChatId }: { chat: Chat; isRenaming: boolean; setRenamingChatId: (id: string | null) => void; }) => {
  const { renameChat } = useChat();
  if (isRenaming) {
    const handleRename = (value: string) => {
      const newTitle = value.trim();
      if (newTitle && newTitle !== chat.title) { renameChat(chat.id, newTitle); }
      setRenamingChatId(null);
    };
    return <input type="text" defaultValue={chat.title} onKeyDown={(e) => e.key === 'Enter' && handleRename(e.currentTarget.value)} onBlur={(e) => handleRename(e.currentTarget.value)} onClick={(e) => e.stopPropagation()} autoFocus className="w-full truncate text-center text-lg font-medium text-black bg-gray-200 rounded p-0 m-0 focus:outline-none" />;
  }
  return <div className="w-full truncate text-center text-lg font-medium text-black">{chat.title}</div>;
};

const BlueRingHighlight = ({ animate }: { animate?: boolean }) => <span className={`pointer-events-none absolute inset-0 -m-1 rounded-lg ring-2 ring-blue-500 z-10 ${animate ? "animate-wiggle-once" : ""}`} />;

const ChatCarousel = ({ hook, renamingChatId, setRenamingChatId, setDeletingChat }: { hook: ReturnType<typeof useChatSelector>; renamingChatId: string | null; setRenamingChatId: (id: string | null) => void; setDeletingChat: (chat: Chat) => void; }) => {
  const { chats, len, selected, motionKey, dirRef, slotCount, CARD_H, GAP, setCurrentChat, animateTo } = hook;
  const { currentChatId } = useChat();
  const half = Math.floor(slotCount / 2);
  const OFFSETS = Array.from({ length: slotCount }, (_, i) => i - half);
  const [ringAnimate, setRingAnimate] = useState(false);
  useEffect(() => { setRingAnimate(true); const timer = setTimeout(() => setRingAnimate(false), 300); return () => clearTimeout(timer); }, [selected]);

  return (
    <div className="relative flex w-full h-full items-center justify-center isolate">
      {OFFSETS.map((o) => {
        const idx = mod(selected + o, len);
        const chat = chats[idx];
        if (!chat) return null;
        const isCentre = o === 0;

        const handleClick = () => {
          if (renamingChatId === chat.id) return;
          if (isCentre) {
            if (chat.id !== currentChatId) setCurrentChat(chat.id);
          } else {
            animateTo(idx);
          }
        };

        const translateY = o * (CARD_H + GAP);
        const slideClass = dirRef.current === 1 ? "animate-slot-up-fast" : "animate-slot-down-fast";

        return (
          <div
            key={`${chat.id}-${o}-${motionKey}`}
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
            className="group absolute left-1/2 top-1/2 w-[90%] rounded-lg transition-transform duration-300 cursor-pointer focus:outline-none"
            style={{ height: `${CARD_H}px`, transform: `translate(-50%, calc(-50% + ${translateY}px)) scale(${isCentre ? 1 : 0.98})`, zIndex: isCentre ? 20 : len - Math.abs(o), opacity: 1 }}
          >
            {isCentre && chat.id === currentChatId && <BlueRingHighlight animate={ringAnimate} />}
            <div className={`relative w-full h-full rounded-lg bg-gray-50 flex flex-col justify-center items-center p-2 z-20 ${slideClass} ${isCentre && chat.id === currentChatId ? "shadow-md" : "shadow-sm"}`}>
              <ChatTitle chat={chat} isRenaming={renamingChatId === chat.id} setRenamingChatId={setRenamingChatId} />
              <ModelTicker models={chat.models || []} />
              <ChatOptions onRename={() => setRenamingChatId(chat.id)} onDelete={() => setDeletingChat(chat)} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ChatList = ({ hook, renamingChatId, setRenamingChatId, setDeletingChat }: { hook: ReturnType<typeof useChatSelector>; renamingChatId: string | null; setRenamingChatId: (id: string | null) => void; setDeletingChat: (chat: Chat) => void; }) => {
  const { chats, newlyAddedChatId, setNewlyAddedChatId, setCurrentChat, CARD_H } = hook;
  const { currentChatId } = useChat();
  return (
    <>
      {chats.map((chat) => {
        const isSel = chat.id === currentChatId;
        const isNew = chat.id === newlyAddedChatId;
        return (
          <div
            key={chat.id}
            role="button"
            tabIndex={0}
            onClick={() => renamingChatId !== chat.id && setCurrentChat(chat.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && renamingChatId !== chat.id && setCurrentChat(chat.id)}
            onAnimationEnd={() => { if (isNew) setNewlyAddedChatId(null); }}
            style={{ height: `${CARD_H}px` }}
            className={`group relative w-[90%] flex-shrink-0 transition-all duration-200 cursor-pointer focus:outline-none mt-2 first:mt-0 ${isNew ? "animate-wiggle-once" : ""}`}
          >
            {isSel && <BlueRingHighlight />}
            <div className={`w-full h-full rounded-lg bg-gray-50 hover:bg-gray-100 flex flex-col justify-center items-center p-2 ${isSel ? "shadow-md" : "shadow-sm"}`}>
              <ChatTitle chat={chat} isRenaming={renamingChatId === chat.id} setRenamingChatId={setRenamingChatId} />
              <ModelTicker models={chat.models || []} />
              <ChatOptions onRename={() => setRenamingChatId(chat.id)} onDelete={() => setDeletingChat(chat)} />
            </div>
          </div>
        );
      })}
    </>
  );
};

export default function ChatSelector() {
  const containerRef = useRef<HTMLElement>(null!);
  const hook = useChatSelector(containerRef);
  const { onWheel, onKeyDown, isCarousel } = hook;
  const { deleteChat } = useChat();

  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [deletingChat, setDeletingChat] = useState<Chat | null>(null);

  const handleConfirmDelete = () => {
    if (deletingChat) {
      deleteChat(deletingChat.id);
      setDeletingChat(null);
    }
  };

  const baseClasses = "relative h-full w-full flex-1 select-none px-2 focus:outline-none";
  const layoutClasses = isCarousel ? "flex flex-col items-center justify-center overflow-hidden" : "flex flex-col items-center overflow-y-auto py-2";

  return (
    <>
      <DeleteConfirmationModal
        isOpen={deletingChat !== null}
        chat={deletingChat}
        onClose={() => setDeletingChat(null)}
        onConfirm={handleConfirmDelete}
      />
      <aside ref={containerRef} tabIndex={0} className={`${baseClasses} ${layoutClasses}`} onWheel={onWheel} onKeyDown={onKeyDown}>
        {isCarousel ? (
          <ChatCarousel hook={hook} renamingChatId={renamingChatId} setRenamingChatId={setRenamingChatId} setDeletingChat={setDeletingChat} />
        ) : (
          <ChatList hook={hook} renamingChatId={renamingChatId} setRenamingChatId={setRenamingChatId} setDeletingChat={setDeletingChat} />
        )}
      </aside>
    </>
  );
}
