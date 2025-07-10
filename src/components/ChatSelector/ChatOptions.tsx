"use client";

import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import Portal from '@/components/Portal';

const ThreeDotsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>;
const RenameIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

interface ChatOptionsProps {
  onRename: () => void;
  onDelete: () => void;
}

export default function ChatOptions({ onRename, onDelete }: ChatOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  const handleToggleMouseDown = (e: MouseEvent) => {
    e.stopPropagation();
    if (buttonRef.current && !isOpen) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - 192,
      });
    }
    setIsOpen(prev => !prev);
  };

  const handleRenameClick = (e: MouseEvent) => { e.stopPropagation(); onRename(); setIsOpen(false); };
  const handleDeleteClick = (e: MouseEvent) => { e.stopPropagation(); onDelete(); setIsOpen(false); };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = () => setIsOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div
      className="absolute top-1/2 right-1 -translate-y-1/2 z-20"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={buttonRef}
        onMouseDown={handleToggleMouseDown}
        className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-500/10 transition-opacity opacity-0 group-hover:opacity-100"
      >
        <ThreeDotsIcon />
      </button>

      {isOpen && (
        <Portal>
          <div
            style={{ top: `${popupPosition.top}px`, left: `${popupPosition.left}px` }}
            className="fixed w-48 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-50"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={handleRenameClick} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              <RenameIcon />
              <span className="ml-3">Rename</span>
            </button>
            <button onClick={handleDeleteClick} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
              <DeleteIcon />
              <span className="ml-3">Delete chat</span>
            </button>
          </div>
        </Portal>
      )}
    </div>
  );
}
