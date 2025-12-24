import styles from './page.module.css'

export default function AdminDashboard() {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <span className={styles.kicker}>Admin Overview</span>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            Welcome to your cricket club management dashboard.
          </p>
        </header>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h2>Recent Matches</h2>
            <p>View and manage your match history.</p>
          </div>

          <div className={styles.card}>
            <h2>Players</h2>
            <p>Keep player profiles, form, and availability tidy.</p>
          </div>

          <div className={styles.card}>
            <h2>Teams</h2>
            <p>Organize squads and lineup rotations in one place.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
