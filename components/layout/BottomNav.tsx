'use client';

import { House, Package, Tag } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './BottomNav.module.css';

const ITEMS = [
  { href: '/inicio', label: 'Inicio', Icon: House },
  { href: '/inventario', label: 'Inventario', Icon: Package },
  { href: '/promos', label: 'Promos', Icon: Tag },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Navegación principal">
      <ul className={styles.list}>
        {ITEMS.map(({ href, label, Icon }) => {
          const activo = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link href={href} className={styles.item} data-active={activo} aria-current={activo ? 'page' : undefined}>
                <Icon size={24} strokeWidth={activo ? 2.25 : 1.75} aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
