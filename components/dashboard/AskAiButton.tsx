'use client';

import { Sparkles } from 'lucide-react';
import { useChat } from './DataChatProvider';
import styles from './AskAiButton.module.css';

// Sends a question about a card to the shared chat and scrolls to the answer.
export function AskAiButton({ pregunta, label = 'Pregúntale a la IA' }: { readonly pregunta: string; readonly label?: string }) {
  const { preguntarEnChat, pensando } = useChat();
  return (
    <button type="button" className={styles.button} onClick={() => preguntarEnChat(pregunta)} disabled={pensando}>
      <Sparkles size={16} aria-hidden /> {label}
    </button>
  );
}
