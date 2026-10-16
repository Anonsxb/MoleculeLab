import Link from "next/link";
import styles from "./subpage.module.css";

export default function NotFound() {
  return (
    <div className={styles.container}>
      <main id="main-content" style={{ paddingTop: "4rem", textAlign: "center" }}>
        <p
          aria-hidden="true"
          style={{ fontSize: "4rem", fontWeight: 800, color: "var(--cyan-accent)", margin: 0 }}
        >
          404
        </p>
        <h1 className={styles.title}>This page doesn&apos;t exist</h1>
        <p className={styles.subtitle} style={{ margin: "0 auto 2rem" }}>
          The address may be mistyped, or the page may have moved. The molecule library is a
          good place to continue.
        </p>
        <div className={styles.buttonRow} style={{ justifyContent: "center" }}>
          <Link href="/library" className={styles.button}>
            Open the library →
          </Link>
          <Link href="/" className={styles.secondaryButton}>
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
