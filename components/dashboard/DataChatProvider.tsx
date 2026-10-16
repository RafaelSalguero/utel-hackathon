'use client';

import { createContext, useContext } from 'react';
import { useDataChat } from '@/hooks/useDataChat';

type ChatValue = ReturnType<typeof useDataChat> & { readonly preguntarEnChat: (texto: string) => void };

const ChatContext = createContext<ChatValue | null>(null);

export const CHAT_ID = 'chat-datos';

// One chat for the whole dashboard: the chat box and every "Pregúntale a la IA"
// button on the cards share the same conversation and answer in progress.
export function DataChatProvider({ children }: { readonly children: React.ReactNode }) {
  const chat = useDataChat();
  const preguntarEnChat = (texto: string) => {
    chat.preguntar(texto);
    document.getElementById(CHAT_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return <ChatContext.Provider value={{ ...chat, preguntarEnChat }}>{children}</ChatContext.Provider>;
}

export const useChat = (): ChatValue => {
  const chat = useContext(ChatContext);
  if (chat === null) throw new Error('useChat must be used inside <DataChatProvider>');
  return chat;
};
