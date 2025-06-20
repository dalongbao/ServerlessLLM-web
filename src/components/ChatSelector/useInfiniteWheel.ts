"use client";
import { useEffect, useRef } from 'react';

/**
 * Gives you a ref to a scroll container that feels "endless":
 * when the user nears the top or bottom we jump the scroll position
 * back to the middle so the thumb never hits either edge.
 *
 * Items must all be the same height for the illusion to stay perfect.
 */
export default function useInfiniteWheel(itemCount: number) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rowH = el.firstElementChild?.clientHeight ?? 48; // fallback 48 px

    // centre the scroll bar on mount
    el.scrollTop = el.scrollHeight / 2 - el.clientHeight / 2;

    const onScroll = () => {
      if (el.scrollTop < rowH) {
        // near the very top → jump down one full list
        el.scrollTop += rowH * itemCount;
      } else if (el.scrollTop + el.clientHeight + rowH > el.scrollHeight) {
        // near the bottom → jump up one full list
        el.scrollTop -= rowH * itemCount;
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [itemCount]);

  return { containerRef };
}
