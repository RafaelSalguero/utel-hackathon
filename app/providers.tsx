'use client';

import { Toaster } from '@/components/ui/sonner';
import { StoreProvider } from '@/state/StoreContext';

export function Providers({ children }: { readonly children: React.ReactNode }) {
  return (
    <StoreProvider>
      {children}
      <Toaster position="top-center" theme="light" />
    </StoreProvider>
  );
}
