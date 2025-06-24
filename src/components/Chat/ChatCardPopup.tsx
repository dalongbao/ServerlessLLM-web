"use client";

import React, { useEffect, type RefObject } from "react";

interface Props {
  anchor: RefObject<HTMLButtonElement>;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function ChatCardPopup({
  anchor,
  onRename,
  onDelete,
  onClose,
}: Props) {
  /* close when you click anywhere else */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Close if clicking outside the popup itself.
      // The anchor check is now more for initial positioning.
      if (anchor.current && !anchor.current.contains(e.target as Node)) {
          onClose();
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [anchor, onClose]);

  /* position just below the 3-dot button */
  const rect = anchor.current?.getBoundingClientRect();
  const style = rect
    ? { 
        position: "fixed", 
        top: rect.bottom + 4, 
        left: rect.right - 120, 
        zIndex: 1000 
      }
    : {};

  return (
    <div style={style} className="w-[120px] rounded-md border bg-white py-1 shadow-lg">
      <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100" onClick={onRename}>
        Rename
      </button>
      <button className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100" onClick={onDelete}>
        Delete chat
      </button>
    </div>
  );
}
