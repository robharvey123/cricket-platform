import styles from './page.module.css'

export default function SeasonsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <span className={styles.kicker}>Competition Setup</span>
          <h1 className={styles.title}>Seasons</h1>
          <p className={styles.subtitle}>
            Manage fixtures, standings, and historical seasons in one view.
          </p>
        </header>

        <section className={styles.emptyCard}>
          <h2>Seasons management coming soon</h2>
          <p>We are building season timelines, fixture blocks, and summaries.</p>
        </section>
      </div>
    </div>
  )
}
