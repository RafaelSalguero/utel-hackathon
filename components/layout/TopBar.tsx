'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import styles from './TopBar.module.css';

export function TopBar({ href, label, strong = false }: { readonly href: string; readonly label: string; readonly strong?: boolean }) {
  return (
    <header className={styles.bar}>
      <Link href={href} className={styles.back} aria-label={`Volver a ${label}`}>
        <ChevronLeft size={24} aria-hidden />
      </Link>
      <span className={strong ? styles.labelStrong : styles.label}>{label}</span>
    </header>
  );
}
