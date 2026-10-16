'use client';

import { BottomNav } from '@/components/layout/BottomNav';
import { RequireData } from '@/components/layout/RequireData';

export default function AppLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <RequireData>
      {children}
      <BottomNav />
    </RequireData>
  );
}
