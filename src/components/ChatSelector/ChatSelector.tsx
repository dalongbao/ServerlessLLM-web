"use client";

import React, { useRef, useEffect, useState } from "react";
import { useChat } from "@/context/ChatProvider";
import { useChatSelector } from "./useChatSelector"; 
import ModelTicker from "./ModelTicker";

const mod = (n: number, m: number) => ((n % m) + m) % m;

const BlueRingHighlight = ({ animate }: { animate?: boolean }) => (
  <span
    className={[
      "pointer-events-none absolute inset-0 -m-1 rounded-lg ring-2 ring-blue-500 z-50",
      animate ? "animate-wiggle-once" : "",
    ].join(" ")}
  />
);

const ChatCarousel = ({
  hook,
  animateTo,
}: {
  hook: ReturnType<typeof useChatSelector>;
  animateTo: (target: number) => void;
}) => {
  const { chats, len, selected, motionKey, dirRef, slotCount, CARD_H, GAP } = hook;
  const half = Math.floor(slotCount / 2);
  const OFFSETS = Array.from({ length: slotCount }, (_, i) => i - half);
  const [ringAnimate, setRingAnimate] = useState(false);

  useEffect(() => {
    setRingAnimate(true);
    const timer = setTimeout(() => setRingAnimate(false), 300); 
    return () => clearTimeout(timer);
  }, [selected]);

  return (
    <div className="relative flex w-full h-full items-center justify-center isolate">
      {OFFSETS.map((o) => {
        const idx = mod(selected + o, len);
        const chat = chats[idx];
        if (!chat) return null; 
        const isCentre = o === 0;
        const translateY = o * (CARD_H + GAP);
        const slideClass = dirRef.current === 1 ? "animate-slot-up-fast" : "animate-slot-down-fast";

        return (
          <button
            key={`${chat.id}-${o}-${motionKey}`}
            onClick={() => animateTo(idx)}
            className="absolute left-1/2 top-1/2 w-[90%] rounded-lg transition-transform duration-300"
            style={{
              height: `${CARD_H}px`,
              transform: `translate(-50%, calc(-50% + ${translateY}px)) scale(${isCentre ? 1 : 0.98})`,
              zIndex: isCentre ? 10 : len - Math.abs(o),
              opacity: isCentre ? 1 : 0.5,
            }}
          >
            {isCentre && <BlueRingHighlight animate={ringAnimate} />}
            <div
              className={`relative z-0 w-full h-full rounded-lg bg-gray-50 flex flex-col justify-center items-center p-2 ${slideClass} ${isCentre ? "shadow-md" : "shadow-sm"}`}
            >
              <div className="w-full truncate text-center text-lg font-medium text-black">
                {chat.title}
              </div>
              <ModelTicker models={chat.models || []} />
            </div>
          </button>
        );
      })}
    </div>
  );
};

const ChatList = ({ hook }: { hook: ReturnType<typeof useChatSelector> }) => {
  const { chats, selected, newChatId, setNewChatId, CARD_H } = hook;
  const { setCurrentChat } = useChat();

  return (
    <>
      {chats.map((chat, idx) => {
        const isSel = idx === selected;
        const isNew = chat.id === newChatId;
        return (
          <button
            key={chat.id}
            onClick={() => setCurrentChat(chat.id)}
            onAnimationEnd={() => {
              if (isNew) setNewChatId(null);
            }}
            style={{ height: `${CARD_H}px` }}
            className={`relative w-[90%] flex-shrink-0 transition-all duration-200 ${idx > 0 && "mt-2"} ${isNew && "animate-wiggle-once"}`}
          >
            {isSel && <BlueRingHighlight />}
            <div className={`w-full h-full rounded-lg text-center text-lg text-black bg-gray-50 hover:bg-gray-100 flex flex-col justify-center items-center p-2 ${isSel ? "shadow-md" : "shadow-sm"}`}>
              <div className="w-full truncate font-medium">{chat.title}</div>
              <ModelTicker models={chat.models || []} />
            </div>
          </button>
        );
      })}
    </>
  );
};

// The main, now much cleaner, component
export default function ChatSelector() {
  const containerRef = useRef<HTMLElement | null>(null);
  const hook = useChatSelector(containerRef);
  const { onWheel, onKeyDown, isCarousel, animateTo } = hook;

  const baseClasses = "relative h-full w-full flex-1 select-none px-2 focus:outline-none";
  const layoutClasses = isCarousel
    ? "flex flex-col items-center justify-center overflow-hidden"
    : "flex flex-col items-center overflow-y-auto py-2";

  return (
    <aside
      ref={containerRef}
      tabIndex={0}
      className={`${baseClasses} ${layoutClasses}`}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
    >
      {isCarousel ? (
        <ChatCarousel hook={hook} animateTo={animateTo} />
      ) : (
        <ChatList hook={hook} />
      )}
    </aside>
  );
}
