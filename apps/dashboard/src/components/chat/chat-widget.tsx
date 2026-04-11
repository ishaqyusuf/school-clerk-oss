"use client";

import { Button } from "@school-clerk/ui/button";
import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { ChatPanel } from "./chat-panel";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-5 right-5 z-50">
        <Button
          onClick={() => setIsOpen((v) => !v)}
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
          aria-label={isOpen ? "Close assistant" : "Open school assistant"}
        >
          {isOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <MessageCircle className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Chat panel popover */}
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={[
              "fixed z-40 flex flex-col overflow-hidden bg-background shadow-2xl",
              // Mobile: full screen
              "inset-0 md:inset-auto",
              // Desktop: positioned panel
              "md:bottom-20 md:right-5 md:h-[600px] md:w-[380px] md:rounded-2xl md:border",
            ].join(" ")}
          >
            <ChatPanel />
          </div>
        </>
      )}
    </>
  );
}
