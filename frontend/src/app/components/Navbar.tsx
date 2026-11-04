"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Navbar.module.css";

const NAV_LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/library', label: 'Library & Screening' },
  { href: '/compare', label: 'Compare' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/studio', label: '3D Studio' },
  { href: '/validate', label: 'Check SMILES' },
  { href: '/import', label: 'Import' },
  { href: '/export', label: 'Export' },
  { href: '/docs', label: 'Methodology' },
  { href: '/developers', label: 'API & Developers' },
];

function NavLinks() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      const current = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null;
      if (current) return current;
    }
    return 'light';
  });

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('drugmatch_theme', next);
    } catch {
      // localStorage might not be available
    }
  };

  return (
    <div className={styles.navContainer}>
      <Link href="/" className={styles.brandLink} aria-label="DrugMatch Home">
        <span className={styles.brandEmblem} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 19 6 19 14 12 18 5 14 5 6 12 2" />
            <circle cx="12" cy="10" r="3" fill="#CF8E69" stroke="none" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <circle cx="12" cy="22" r="1.5" fill="currentColor" />
          </svg>
        </span>
        <div className={styles.brandMeta}>
          <span className={styles.brandTitle}>DrugMatch</span>
          <span className={styles.brandTag}>Screening System</span>
        </div>
      </Link>

      <div className={styles.navScroll}>
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
      </div>

      <div className={styles.navActions}>
        <button
          type="button"
          onClick={toggleTheme}
          className={styles.themeToggle}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
          <span className={styles.themeText}>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
      </div>
    </div>
  );
}

export default function Navbar() {
  return (
    <>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <nav aria-label="Primary" className={styles.nav}>
        <Suspense fallback={<div className={styles.navContainer} />}>
          <NavLinks />
        </Suspense>
      </nav>
    </>
  );
}
