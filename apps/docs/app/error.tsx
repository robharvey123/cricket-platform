"use client";

import { useEffect } from "react";
import styles from "./page.module.css";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Something went wrong!</h1>
        <p>
          We apologize for the inconvenience. An error occurred while processing
          your request.
        </p>
        {error.digest && (
          <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid currentColor",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </main>
    </div>
  );
}
