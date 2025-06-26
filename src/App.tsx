"use client";

import ChatWindow from "@/components/Chat/ChatWindow";
import ChatBar from "@/components/Chat/ChatBar";
import ChatSelector from "@/components/ChatSelector/ChatSelector";
import NewChat from "@/components/ChatSelector/NewChat";
import { ChatProvider } from "@/context/ChatProvider";
import  StatusPanel  from "@/components/StatusPanel/StatusPanel"; 

// These are likely simple div wrappers with classNames, so we can replace them
// with divs directly for this example.

export default function App() {
  return (
    <ChatProvider>
      <main className="flex h-screen w-screen overflow-hidden bg-white">
        
        {/* ───────── Left half (RE-ARRANGED) ───────── */}
        <section className="flex w-3/8 flex-col">
          
          {/* Top 1/3 for Worker and Status */}
          <div className="flex-2">
            {/* We only have the status panel for now, but a worker panel could be added here */}
            <StatusPanel/>
          </div>
          
          {/* Bottom 2/3 for Chat Selector */}
          <div className="relative flex flex-[3] flex-col overflow-hidden pb-4">
            <ChatSelector />
            <NewChat />
          </div>

        </section>

        {/* ───────── Right half (Unchanged) ───────── */}
        <section className="flex h-full w-5/8 flex-col border-l"> 
          <ChatBar />
          <ChatWindow />
        </section>
      </main>
    </ChatProvider>
  );
}
