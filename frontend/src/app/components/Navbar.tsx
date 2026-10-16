"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Navbar.module.css";

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/library', label: 'Library' },
  { href: '/validate', label: 'Check SMILES' },
  { href: '/compare', label: 'Compare' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/import', label: 'Import' },
  { href: '/export', label: 'Export' },
  { href: '/docs', label: 'Docs' },
];

function NavLinks() {
  const pathname = usePathname();

  return (
    <ul className={styles.list}>
      {NAV_LINKS.map((link) => {
        const isActive =
          link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={isActive ? 'page' : undefined}
              className={`${styles.link} ${isActive ? styles.active : ''}`}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function Navbar() {
  return (
    <>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <nav aria-label="Primary" className={styles.nav}>
        <Suspense fallback={<ul className={styles.list} />}>
          <NavLinks />
        </Suspense>
      </nav>
    </>
  );
}
