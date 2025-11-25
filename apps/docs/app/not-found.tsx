import Link from "next/link";
import styles from "./page.module.css";

export default function NotFound() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>404 - Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
        <Link
          href="/"
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid currentColor",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Return Home
        </Link>
      </main>
    </div>
  );
}
