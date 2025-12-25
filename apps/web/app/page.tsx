import Link from 'next/link'
import styles from './page.module.css'

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <main className={styles.hero}>
        <div className={styles.copy}>
          <span className={styles.kicker}>Club Operations Suite</span>
          <h1 className={styles.title}>Cricket Platform</h1>
          <p className={styles.subtitle}>
            Run fixtures, scorecards, and player performance in one calm, focused workspace.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/auth/signin">
              Sign In
            </Link>
            <Link className={styles.secondary} href="/admin">
              Open Admin
            </Link>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelEyebrow}>Match Day</span>
            <h2 className={styles.panelTitle}>Everything you need, before the toss.</h2>
          </div>
          <div className={styles.cardGrid}>
            <article className={styles.card}>
              <h3>Smart Imports</h3>
              <p>Pull scorecards from PDFs and tidy them up in minutes.</p>
            </article>
            <article className={styles.card}>
              <h3>Live Scoring</h3>
              <p>Track innings, extras, and milestones without juggling sheets.</p>
            </article>
            <article className={styles.card}>
              <h3>Player Insights</h3>
              <p>See form trends and performance breakdowns instantly.</p>
            </article>
            <article className={styles.card}>
              <h3>Club Memory</h3>
              <p>Keep seasons, squads, and fixtures organized for the long haul.</p>
            </article>
          </div>
        </div>
      </main>
    </div>
  )
}
