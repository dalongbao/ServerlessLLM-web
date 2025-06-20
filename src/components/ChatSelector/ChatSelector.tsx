"use client"

import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useChat } from "@/context/ChatProvider";

const CARD_H = 66;

export default function ChatSelector() {
  const { chats, currentChatId, setCurrentChat } = useChat();
  const len = chats.length;
  const [selected, setSelected] = React.useState(
    Math.max(0, chats.findIndex((c) => c.id === currentChatId)),
  );
  const [motionKey, setMotionKey] = React.useState(0);
  const dirRef = React.useRef<1 | -1>(1);
  const containerRef = useRef<HTMLElement | null>(null);
  const [slotCount, setSlotCount] = useState(5);
  const half = Math.floor(slotCount / 2);
  const OFFSETS = Array.from({ length: slotCount }, (_, i) => i - half);

  /* ───────────────── sync external selection ───────────────── */
  React.useEffect(() => {
    const i = chats.findIndex((c) => c.id === currentChatId);
    if (i !== -1 && i !== selected) setSelected(i);
  }, [currentChatId]);

  const isCarousel = len > slotCount;
  const mod = (n: number, m: number) => ((n % m) + m) % m;

  const move = (dir: 1 | -1) => {
    const next = isCarousel
      ? mod(selected + dir, len)
      : Math.min(Math.max(selected + dir, 0), len - 1);

    if (next === selected) return;
    dirRef.current = dir;
    setSelected(next);
    setCurrentChat(chats[next].id);
    setMotionKey(k => k+1);
  };

  const animateTo = (target: number) => {
    if (target === selected) return;

    // work out shortest direction in a ring
    let diff = mod(target - selected, len);       // 0…len-1
    if (diff > len / 2) diff -= len;              // –len/2…len/2
    const dir = diff > 0 ? 1 : -1;
    const steps = Math.abs(diff);

    const step = (n: number) => {
      move(dir);                                  // reuse existing logic
      if (n > 1) setTimeout(() => step(n - 1), 80); // 120 ms per slot
    };
    step(steps);
  };

  const [newChatId, setNewChatId] = useState<string | null>(null);
  const prevLen = useRef(chats.length);

  // whenever chats length increases, mark the last item as "new"
  useEffect(() => {
    if (chats.length > prevLen.current) {
      setNewChatId(chats[chats.length - 1].id);
    }
    prevLen.current = chats.length;
  }, [chats]);

  /* ───────────── wheel resistance logic ───────────── */
  const ACCUM_THRESHOLD = 60;          // px of wheel delta before we move
  const accumRef = React.useRef(0);

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

  useLayoutEffect(() => {
  if (!containerRef.current) return;
  const el = containerRef.current;

  const measure = () => {
    const h = el.clientHeight;                  // visible height only
    let rows = Math.max(3, Math.floor(el.clientHeight / CARD_H));
    if (rows % 2 === 0) rows += 1;
    setSlotCount(Math.min(rows, chats.length));
  };

  measure();                                   // run once
  const ro = new ResizeObserver(measure);      // height of the box changes
  ro.observe(el);
  window.addEventListener("resize", measure);  // window resizes

  return () => {
    ro.disconnect();
    window.removeEventListener("resize", measure);
  };
}, [chats.length]);  /* 2️⃣  keep top padding when we first paint the list */
  useEffect(() => {
    const sel = document.getElementById(`chat-btn-${selected}`);
    if (!sel) return;

    sel.scrollIntoView({
      block : selected === 0 ? "start" : "nearest", // honour pt-2 on first row
      inline: "nearest",
      behavior: "smooth",
    });
  }, [selected]);

  /* ───────────── container classes ───────────── */
  const base = "chat-selector relative h-full w-full flex-1 overflow-hidden select-none px-2 pt-2 pb-2 focus:outline-none";

  if (!len) return null;

  /* ───────────── Carousel (≥ 5) ───────────── */
  if (isCarousel) {
    return (
      <aside
        ref={containerRef}
        tabIndex={0}
        className={`${base} flex flex-col items-center justify-center`}  
        onWheel={onWheel}
        onKeyDown={onKeyDown}
      >
        <div className="relative flex w-full items-center justify-center isolate">
          {OFFSETS.map((o) => {
            const idx        = mod(selected + o, len);
            const chat       = chats[idx];
            const translateY = o * CARD_H;
            const isCentre   = o === 0;
            const slideClass =
              dirRef.current === 1 ? "animate-slot-up-fast" : "animate-slot-down-fast";

            return (
              <button
                key={`${chat.id}-${o}-${motionKey}`}
                onClick={() => animateTo(idx)}
                className={[
                  "absolute left-1/2 top-1/2 w-[80%] rounded-lg",
                  "transition-transform duration-300",
                  // higher z-index only for the selected card
                  isCentre ? "z-50" : "z-0",
                ].join(" ")}
                style={{
                  transform: `translate(-50%, calc(-50% + ${translateY}px))`,
                }}
              >
                {/* ─── blue-ring overlay ─── */}
                {isCentre && (
                  <span
                    className="
                      pointer-events-none absolute inset-0 -m-1
                      rounded-lg ring-2 ring-blue-200
                      z-50                       /* always paints last */
                      animate-wiggle-once
                    "
                  />
                )}

                {/* ─── card content ─── */}
                <div
                  className={[
                    slideClass,
                    "relative z-0 w-full rounded-lg bg-gray-50 animate-rotate-wiggle-fast",
                  ].join(" ")}
                >
                  <div className="truncate py-3 text-center text-lg font-medium text-black">
                    {chat.title}
                  </div>
                </div>
              </button>
            );
          })}     
        </div>
      </aside>
    );
  }

  /* ───────────── Static (< 5) ───────────── */
  return (
    <aside
      ref={containerRef}
      tabIndex={0}
      className={`${base} flex flex-col items-center justify-start overflow-y-auto`}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
    >
      {chats.map((chat, idx) => {
        const isSel   = idx === selected;
        const isNew   = chat.id === newChatId;

        return (
          <button
            key={chat.id}
            onClick={() => {
              setSelected(idx);
              setCurrentChat(chat.id);
            }}
            onAnimationEnd={() => {
              if (chat.id === newChatId) setNewChatId(null); // reset
            }}
            className={[
              "my-2 w-[80%] rounded-lg py-3 text-center text-lg text-black",
              "transition-transform duration-200 bg-gray-50 hover:bg-gray-100",
              isSel
                ? "ring-2 ring-blue-200"
                : "hover:bg-gray-50 focus:ring-1 focus:ring-blue-100",
              isNew && "animate-wiggle-once",       // ← little shake here
            ].join(" ")}
          >
            {chat.title}
          </button>
        );
      })}
    </aside>
  );
}
