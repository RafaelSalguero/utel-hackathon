'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useStore } from '@/hooks/useStore';

// Data lives only in memory: after a reload it is gone and the user goes back to upload.
export function RequireData({ children }: { readonly children: React.ReactNode }) {
  const { state } = useStore();
  const router = useRouter();
  const vacio = state.status === 'vacio';

  useEffect(() => {
    if (vacio) router.replace('/');
  }, [vacio, router]);

  return vacio ? null : children;
}
