import styles from './page.module.css'

export default function TeamsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <span className={styles.kicker}>Club Structure</span>
          <h1 className={styles.title}>Teams</h1>
          <p className={styles.subtitle}>
            Organize squads, captains, and weekly selections.
          </p>
        </header>

        <section className={styles.emptyCard}>
          <h2>Teams management coming soon</h2>
          <p>We are building lineup tools, squad lists, and availability tracking.</p>
        </section>
      </div>
    </div>
  )
}
