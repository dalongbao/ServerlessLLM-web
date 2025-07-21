"use client";
import React, { useState } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface ThinkBlockProps {
  content: string;
  defaultCollapsed?: boolean;
}

export default function ThinkBlock({ content, defaultCollapsed = true }: ThinkBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className="my-2 border border-blue-200 rounded-lg bg-blue-50/50">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-blue-100/50 transition-colors"
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? "Expand reasoning trace" : "Collapse reasoning trace"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-blue-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-blue-600 flex-shrink-0" />
        )}
        <Brain className="h-4 w-4 text-blue-600 flex-shrink-0" />
        <span className="text-sm font-medium text-blue-800">
          {isCollapsed ? "Show reasoning trace" : "Hide reasoning trace"}
        </span>
        <div className="ml-auto text-xs text-blue-600">
          {content.length} characters
        </div>
      </button>
      
      {!isCollapsed && (
        <div className="px-3 pb-3 border-t border-blue-200">
          <div className="text-sm text-blue-900 bg-white rounded p-3 mt-2">
            <div className="prose prose-sm max-w-none prose-blue">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}