"use client";

import dynamic from 'next/dynamic';
const ChatWindow = dynamic(() => import("@/components/Chat/ChatWindow"),{ ssr: false });
import ChatBar from "@/components/Chat/ChatBar";
import { MenuBar } from "@/components/MenuBar/MenuBar";
const ChatSelector = dynamic(() => import('@/components/ChatSelector/ChatSelector'), { ssr: false });
import NewChat from "@/components/ChatSelector/NewChat";
import { ChatProvider } from "@/context/ChatProvider";
import  StatusPanel  from "@/components/StatusPanel/StatusPanel";
import HealthPopup from "@/components/StatusPanel/HealthPopup";
import { ToastProvider } from "@/context/ToastProvider";
import { useChat } from "@/context/ChatProvider"; 

function AppContent() {
  const { healthStatus } = useChat();
  
  return (
    <>
      <main className="flex h-screen w-screen overflow-hidden bg-white">
        <section className="flex w-3/8 flex-col">
          <div className="flex-0.5">
            <MenuBar/>
          </div>
          
          <div className="flex-2">
            <StatusPanel/>
          </div>
          <div className="relative flex flex-[2.5] flex-col overflow-hidden">
            <div className="flex-1 min-h-0">
              <ChatSelector />
            </div>
            <div className="flex-shrink-0 pb-4">
              <NewChat />
            </div>
          </div>

        </section>
        <section className="flex h-full w-5/8 flex-col border-l border-gray-200"> 
          <ChatBar />
          <ChatWindow />
        </section>
      </main>
      <HealthPopup healthStatus={healthStatus} />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ChatProvider>
        <AppContent />
      </ChatProvider>
    </ToastProvider>
  );
}
