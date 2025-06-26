import { useEffect, useRef } from "react";

export const usePolling = (fn: () => void | Promise<void>, ms: number) => {
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    const tick = () => saved.current();
    tick();
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [ms]);
};
