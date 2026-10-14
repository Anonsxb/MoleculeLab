"use client";

import Link from "next/link";
import styles from "./states.module.css";

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBlock({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className={styles.error} role="alert">
      <strong>Something went wrong.</strong> {message}
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  );
}

export function EmptyBlock({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className={styles.empty}>
      <strong>{title}</strong>
      {children && <div className={styles.hint}>{children}</div>}
    </div>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.notice} role="note">
      <span aria-hidden="true">ℹ</span>
      <span>{children}</span>
    </div>
  );
}

/** Renders a backend-rendered 2D structure SVG safely parsed as text. */
export function MoleculeStructure({ svg, label }: { svg?: string | null; label: string }) {
  if (!svg) {
    return (
      <div className={styles.structureFallback} role="img" aria-label={`${label}: structure unavailable`}>
        Structure depiction unavailable for this molecule.
      </div>
    );
  }
  return (
    <div
      className={styles.structure}
      role="img"
      aria-label={`Two-dimensional structure of ${label}`}
      // SVG is produced by the backend RDKit engine, never by user input.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function BackLink({ href = "/", label = "← Back to home" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className={styles.back}>
      {label}
    </Link>
  );
}

export function ValueCell({ value, unit }: { value: number | null | undefined; unit?: string }) {
  return (
    <>
      {value === null || value === undefined ? (
        <span className={styles.missing} title="Missing or not calculated">
          —
        </span>
      ) : (
        <>
          {Number.isInteger(value) ? value : value.toFixed(4)}
          {unit && <span className={styles.unit}> {unit}</span>}
        </>
      )}
    </>
  );
}
