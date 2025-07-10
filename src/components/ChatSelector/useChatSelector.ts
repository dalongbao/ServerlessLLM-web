"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useChat } from "@/context/ChatProvider";
import { CARD_H, GAP, ACCUM_THRESHOLD } from "@/context/constants";

const mod = (n: number, m: number) => ((n % m) + m) % m;

export const useChatSelector = (containerRef: React.RefObject<HTMLElement>) => {
  const { chats, currentChatId, setCurrentChat } = useChat();
  const len = chats.length;

  const [selected, setSelected] = useState(
    Math.max(0, chats.findIndex((c) => c.id === currentChatId))
  );
  const [newlyAddedChatId, setNewlyAddedChatId] = useState<string | null>(null);
  const [motionKey, setMotionKey] = useState(0);
  const dirRef = useRef<1 | -1>(1);
  const [slotCount, setSlotCount] = useState(5);
  const prevLen = useRef(chats.length);
  const accumRef = useRef(0);
  const isCarousel = len > slotCount;

  useEffect(() => {
    const i = chats.findIndex((c) => c.id === currentChatId);
    if (i !== -1 && i !== selected) {
      setSelected(i);
    }
  }, [currentChatId, chats, selected]);

  useEffect(() => {
    if (chats.length > prevLen.current) {
      const newChat = chats[chats.length - 1];
      if (newChat) {
        setNewlyAddedChatId(newChat.id);
        setSelected(chats.length - 1);
        setCurrentChat(newChat.id);
      }
    }
    prevLen.current = chats.length;
  }, [chats, setCurrentChat]);

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
    setSelected(currentSelected => {
      const next = isCarousel
        ? mod(currentSelected + dir, len)
        : Math.min(Math.max(currentSelected + dir, 0), len - 1);
      
      if (next === currentSelected) return currentSelected;

      dirRef.current = dir;
      setCurrentChat(chats[next].id);
      setMotionKey(k => k + 1);
      return next;
    });
  }, [len, isCarousel, chats, setCurrentChat]);

  const animateTo = useCallback((targetIndex: number) => {
    const startSelected = selected;
    if (targetIndex === startSelected || len <= 1) return;
    
    let diff = mod(targetIndex - startSelected, len);
    if (diff > len / 2) diff -= len; 
    
    const dir = diff > 0 ? 1 : -1;
    const steps = Math.abs(diff);

    const step = (n: number) => {
      if (n <= 0) return;
      move(dir);
      setTimeout(() => step(n - 1), 80);
    };
    step(steps);
  }, [selected, len, move]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    accumRef.current += e.deltaY;
    if (Math.abs(accumRef.current) >= ACCUM_THRESHOLD) {
      move(Math.sign(accumRef.current) as 1 | -1);
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
    newlyAddedChatId, 
    setNewlyAddedChatId, 
    isCarousel,
    slotCount, 
    motionKey, 
    dirRef, 
    onWheel, 
    onKeyDown, 
    animateTo,
    setCurrentChat, 
    CARD_H, 
    GAP,
  };
};
