"use client";

import clsx from "clsx";
import React from "react";

/**
 * MessageBubble — preserves newlines & indents.
 * -------------------------------------------------
 * • whitespace-pre-wrap keeps \n and \t visible.
 * • break-words prevents overflow.
 * • Role‑based colours: blue for user, gray for assistant.
 */
export default function MessageBubble({
  role,
  children,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl px-3 py-2 shadow-sm break-words whitespace-pre-wrap",
        role === "user"
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-black",
      )}
    >
      {children}
    </div>
  );
}
