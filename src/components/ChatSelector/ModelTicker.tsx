import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';

interface TickerProps {
  models: string[];
}

export default function ModelTicker({ models }: TickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measurerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);

  const baseText = models.join(', ');
  const loopText = baseText + ', ';

  // measure once (and on resize) whether we overflow
  const measure = () => {
    if (!containerRef.current || !measurerRef.current) return;
    setOverflow(
      measurerRef.current.scrollWidth > containerRef.current.clientWidth
    );
  };

  // initial measure before paint
  useLayoutEffect(measure, [baseText]);
  // re-measure on resize
  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className=""
    >
      {/* invisible measurer (no wrap) to detect overflow */}
      <div
        ref={measurerRef}
        className="absolute invisible whitespace-nowrap"
      >
        {baseText}
      </div>

      {overflow ? (
        // scrolling, duplicated for seamless loop
        <div
          className="
            absolute left-0 flex
            whitespace-nowrap
            animate-marquee      /* your 10s infinite animation */
          "
        >
          <span className="flex-shrink-0">{loopText}</span>
          <span className="flex-shrink-0">{loopText}</span>
        </div>
      ) : (
        // static, centered when no overflow
        <div className="mx-auto whitespace-nowrap">{baseText}</div>
      )}
    </div>
  );
}
