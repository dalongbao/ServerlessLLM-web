"use client";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import ThinkBlock from "./ThinkBlock";

interface MessageContentProps {
  content: string;
}

interface ParsedContent {
  type: 'text' | 'think';
  content: string;
}

function parseMessageContent(content: string): ParsedContent[] {
  const parts: ParsedContent[] = [];
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  let lastIndex = 0;
  let match;

  while ((match = thinkRegex.exec(content)) !== null) {
    // Add text before the think block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim();
      if (textContent) {
        parts.push({ type: 'text', content: textContent });
      }
    }

    // Add the think block content
    const thinkContent = match[1].trim();
    if (thinkContent) {
      parts.push({ type: 'think', content: thinkContent });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last think block
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex).trim();
    if (textContent) {
      parts.push({ type: 'text', content: textContent });
    }
  }

  // If no think blocks found, return the entire content as text
  if (parts.length === 0 && content.trim()) {
    parts.push({ type: 'text', content: content.trim() });
  }

  return parts;
}

export default function MessageContent({ content }: MessageContentProps) {
  const parsedParts = parseMessageContent(content);

  if (parsedParts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {parsedParts.map((part, index) => {
        if (part.type === 'think') {
          return (
            <ThinkBlock
              key={`think-${index}`}
              content={part.content}
              defaultCollapsed={true}
            />
          );
        } else {
          return (
            <div key={`text-${index}`} className="whitespace-pre-wrap">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {part.content}
              </ReactMarkdown>
            </div>
          );
        }
      })}
    </div>
  );
}