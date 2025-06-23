"use client";
import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  RefObject,
} from "react";
import { useChat, Chat } from "@/context/ChatProvider";
import { ChatCardPopup } from "@/components/Chat/ChatCardPopup";

/* ───────────────── constants & helpers ───────────────── */
const CARD_H = 60;
const GAP = 8; // The space in pixels between cards
const ACCUM_THRESHOLD = 60; // px of wheel delta before we move
const mod = (n: number, m: number) => ((n % m) + m) % m;

export default function ChatSelector() {
  const { chats, currentChatId, setCurrentChat } = useChat();
  /* ───────────────── (Most of your state and hooks are unchanged) ───────────────── */
  const len = chats.length;
  const [selected, setSelected] = useState(
    Math.max(
      0,
      chats.findIndex((c) => c.id === currentChatId),
    ),
  );
  const [motionKey, setMotionKey] = useState(0);
  const dirRef = useRef<1 | -1>(1);
  const containerRef = useRef<HTMLElement | null>(null);
  const [slotCount, setSlotCount] = useState(5);
  const half = Math.floor(slotCount / 2);
  const OFFSETS = Array.from({ length: slotCount }, (_, i) => i - half);
  const [newChatId, setNewChatId] = useState<string | null>(null);
  const prevLen = useRef(chats.length);
  const accumRef = useRef(0);
  const [ringAnimate, setRingAnimate] = useState(false);

  useEffect(() => {
    const i = chats.findIndex((c) => c.id === currentChatId);
    if (i !== -1 && i !== selected) setSelected(i);
  }, [currentChatId, chats, selected]);

  const isCarousel = len > slotCount;

  const move = (dir: 1 | -1) => {
    const next = isCarousel
      ? mod(selected + dir, len)
      : Math.min(Math.max(selected + dir, 0), len - 1);
    if (next === selected) return;
    dirRef.current = dir;
    setSelected(next);
    setCurrentChat(chats[next].id);
    setMotionKey((k) => k + 1);
  };

  const getModelForChat = (chat: Chat): string[] => {
    return chat.model ? [chat.model] : [];
  };

  const animateTo = (target: number) => {
    if (target === selected) return;
    let diff = mod(target - selected, len);
    if (diff > len / 2) diff -= len;
    const dir = diff > 0 ? 1 : -1;
    const step = (n: number) => {
      move(dir);
      if (n > 1) setTimeout(() => step(n - 1), 80);
    };
    step(Math.abs(diff));
  };

  const renderModelTicker = (models: string[]) => {
    const text = models.join(", ");
    return (
      <div className="h-5 mt-1 flex justify-center w-full overflow-hidden text-xs text-gray-600">
        <div className="inline-block whitespace-nowrap animate-[scroll_10s_linear_infinite]">
          {text}
        </div>
      </div>
    );
  };

  useEffect(() => {
    setRingAnimate(true);
    const timer = setTimeout(() => setRingAnimate(false), 300); // Duration of your animation
    return () => clearTimeout(timer);
  }, [selected]);
  
  const TickerPlaceholder = () => <div className="h-5 mt-1" />;

  useEffect(() => {
    if (chats.length > prevLen.current) {
      setNewChatId(chats[chats.length - 1].id);
    }
    prevLen.current = chats.length;
  }, [chats]);
  
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
      const availableHeight = el.clientHeight
      const rowsMin = Math.max(3, Math.floor(availableHeight/ (CARD_H + GAP)));
      const rows = rowsMin % 2 ? rowsMin : rowsMin -1;
      setSlotCount(Math.min(rows, chats.length));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [chats.length]);
  
  useEffect(() => {
    const sel = document.getElementById(`chat-btn-${selected}`);
    if (!sel) return;
    sel.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [selected]);
  
  const base =
    "chat-selector relative h-full w-full flex-1 overflow-hidden select-none px-2 focus:outline-none";
  if (!len) return null;

  // ✅ This is the reusable component for the blue ring
  const BlueRingHighlight = ({ animate }: { animate?: boolean }) => (
    <span
      className={[
        "pointer-events-none absolute inset-0 -m-1 rounded-lg ring-2 ring-blue-500 z-50",
        animate ? "animate-wiggle-once" : "",
      ].join(" ")}
    />
  );

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
        <div className="relative flex w-full h-full items-center justify-center isolate">
          {OFFSETS.map((o) => {
            const idx = mod(selected + o, len);
            const chat = chats[idx];
            const translateY = o * (CARD_H + GAP);
            const isCentre = o === 0;
            const slideClass =
              dirRef.current === 1
                ? "animate-slot-up-fast"
                : "animate-slot-down-fast";
            const models = getModelForChat(chat);

            return (
              <button
                key={`${chat.id}-${o}-${motionKey}`}
                id={`chat-btn-${idx}`}
                onClick={() => animateTo(idx)}
                className="absolute left-1/2 top-1/2 w-[80%] rounded-lg transition-transform duration-300"
                style={{
                  height: `${CARD_H}px`,
                  transform: `translate(-50%, calc(-50% + ${translateY}px)) scale(${isCentre ? 1 : 0.9})`,
                  zIndex: isCentre ? 10 : len - Math.abs(o),
                  opacity: isCentre ? 1 : 0.5,
                }}
              >
                {/* Conditionally render the highlight */}
                {isCentre && <BlueRingHighlight animate={ringAnimate}/>}
                
                {/* Card content */}
                <div
                  className={[
                    slideClass,
                    "relative z-0 w-full h-full rounded-lg bg-gray-50",
                    "flex flex-col justify-center items-center p-2",
                    isCentre ? "shadow-md" : "shadow-sm",
                  ].join(" ")}
                >
                  <div className="w-full truncate text-center text-lg font-medium text-black">
                    {chat.title}
                  </div>
                  {models.length > 0 ? (
                    renderModelTicker(models)
                  ) : (
                    <TickerPlaceholder />
                  )}
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
      className={`${base} flex flex-col items-center overflow-y-auto py-2`}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
    >
      {chats.map((chat, idx) => {
        const isSel = idx === selected;
        const isNew = chat.id === newChatId;
        const models = getModelForChat(chat);
        return (
          <button
            key={chat.id}
            id={`chat-btn-${idx}`}
            onClick={() => {
              setSelected(idx);
              setCurrentChat(chat.id);
            }}
            onAnimationEnd={() => {
              if (chat.id === newChatId) setNewChatId(null);
            }}
            style={{ height: `${CARD_H}px` }}
            // ✅ Added 'relative' to make it a positioning context for the ring
            className={[
              "relative w-[80%] flex-shrink-0 transition-all duration-200",
              idx > 0 && "mt-2",
              isNew && "animate-wiggle-once",
            ].join(" ")}
          >
            {/* ✅ Conditionally render the exact same highlight component */}
            {isSel && <BlueRingHighlight />}

            {/* Card Content - Now wrapped in a div to separate it from the highlight */}
            <div
              className={[
                "w-full h-full rounded-lg text-center text-lg text-black",
                "bg-gray-50 hover:bg-gray-100",
                "flex flex-col justify-center items-center p-2",
                isSel ? "shadow-md" : "shadow-sm",
              ].join(" ")}
            >
              <div className="w-full truncate font-medium">{chat.title}</div>
              {models.length > 0 ? (
                renderModelTicker(models)
              ) : (
                <TickerPlaceholder />
              )}
            </div>
          </button>
        );
      })}
    </aside>
  );
}
