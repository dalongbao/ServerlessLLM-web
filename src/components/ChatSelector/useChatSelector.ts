"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useChat } from "@/context/ChatProvider";

const CARD_H = 60;
const GAP = 8;
const ACCUM_THRESHOLD = 60;
const mod = (n: number, m: number) => ((n % m) + m) % m;

export const useChatSelector = (containerRef: React.RefObject<HTMLElement>) => {
  const { chats, currentChatId, setCurrentChat, addChat } = useChat();
  const len = chats.length;

  const [selected, setSelected] = useState(
    Math.max(0, chats.findIndex((c) => c.id === currentChatId))
  );
  const [motionKey, setMotionKey] = useState(0);
  const dirRef = useRef<1 | -1>(1);
  const [slotCount, setSlotCount] = useState(5);
  const [newChatId, setNewChatId] = useState<string | null>(null);
  const prevLen = useRef(chats.length);
  const accumRef = useRef(0);

  const isCarousel = len > slotCount;

  // Sync selection with external changes to currentChatId
  useEffect(() => {
    const i = chats.findIndex((c) => c.id === currentChatId);
    if (i !== -1 && i !== selected) {
      setSelected(i);
    }
  }, [currentChatId, chats, selected]);

  // Animate a new chat when it's added
  useEffect(() => {
    if (chats.length > prevLen.current) {
      const newChat = chats[chats.length - 1];
      setNewChatId(newChat.id);
      // Automatically select the new chat
      setSelected(chats.length - 1);
      setCurrentChat(newChat.id);
    }
    prevLen.current = chats.length;
  }, [chats, setCurrentChat]);

  // Determine the number of visible slots based on container height
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const measure = () => {
      const availableHeight = el.clientHeight;
      const rowsMin = Math.max(3, Math.floor(availableHeight / (CARD_H + GAP)));
      const rows = rowsMin % 2 ? rowsMin : rowsMin - 1; 
      setSlotCount(Math.min(rows, len || 5));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [len, containerRef]);

  const move = useCallback((dir: 1 | -1) => {
    if (len <= 1) return;
    const next = isCarousel
      ? mod(selected + dir, len)
      : Math.min(Math.max(selected + dir, 0), len - 1);
      
    if (next === selected) return;

    dirRef.current = dir;
    setSelected(next);
    setCurrentChat(chats[next].id);
    setMotionKey((k) => k + 1);
  }, [selected, len, isCarousel, chats, setCurrentChat]);

  const animateTo = useCallback((target: number) => {
    if (target === selected) return;
    let diff = mod(target - selected, len);
    if (diff > len / 2) diff -= len; 
    const dir = diff > 0 ? 1 : -1;
    
    const step = (n: number) => {
      move(dir);
      if (n > 1) setTimeout(() => step(n - 1), 80);
    };
    step(Math.abs(diff));
  }, [selected, len, move]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    accumRef.current += e.deltaY;
    if (accumRef.current >= ACCUM_THRESHOLD) {
      move(1);
      accumRef.current = 0;
    } else if (accumRef.current <= -ACCUM_THRESHOLD) {
      move(-1);
      accumRef.current = 0;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") move(1);
    if (e.key === "ArrowUp") move(-1);
  };

  return {
    chats,
    len,
    selected,
    setSelected,
    newChatId,
    setNewChatId,
    isCarousel,
    slotCount,
    motionKey,
    dirRef,
    onWheel,
    onKeyDown,
    animateTo,
    CARD_H,
    GAP,
  };
};
