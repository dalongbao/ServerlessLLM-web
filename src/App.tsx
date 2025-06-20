"use client";

import ChatWindow from "@/components/Chat/ChatWindow";
import ChatSelector from "@/components/ChatSelector/ChatSelector";
import NewChat from "@/components/ChatSelector/NewChat";
import { ChatProvider } from "@/context/ChatProvider";

import TopPanel from "@/components/TopPanel/TopPanel";
import BottomPanel from "@/components/BottomPanel/BottomPanel";

export default function App() {
  return (
    <ChatProvider>
      <main className="flex h-screen w-screen overflow-hidden bg-white">
        {/* ───────── Left half ───────── */}
        <section className="flex w-1/2 flex-col">
          {/* Top ⅔ … now split LEFT/RIGHT */}
          <div className="flex flex-row flex-[4]">
            {/* left side of the top area */}
            <TopPanel className="flex-1" />

            {/* right side of the top area */}
          <div className="relative flex flex-col flex-1 overflow-hidden">
              <ChatSelector />
              <NewChat />
            </div>
          </div>

          {/* Bottom ⅓ (full width) */}
          <BottomPanel className="flex-[3]" />
        </section>

        {/* ───────── Right half ───────── */}
        <section className="h-full w-1/2 border-l border-gray-200">
          <ChatWindow />
        </section>
      </main>
    </ChatProvider>
  );
}
