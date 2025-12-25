import Link from 'next/link'
import styles from './page.module.css'

export default function AdminDashboard() {
  const runs = [88, 124, 96, 142, 118, 165]
  const wickets = [4, 7, 5, 9, 6, 8]
  const maxRuns = Math.max(...runs)
  const runPoints = runs
    .map((value, index) => {
      const x = (index / (runs.length - 1)) * 100
      const y = 100 - (value / maxRuns) * 100
      return `${x},${y}`
    })
    .join(' ')

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
          <Link className={styles.cardLink} href="/admin/matches">
            <h2>Recent Matches</h2>
            <p>View scorecards, import new matches, and publish results.</p>
            <span className={styles.cardCta}>Go to matches →</span>
          </Link>

          <Link className={styles.cardLink} href="/admin/players">
            <h2>Players</h2>
            <p>Keep player profiles, form, and availability tidy.</p>
            <span className={styles.cardCta}>Manage squad →</span>
          </Link>

          <Link className={styles.cardLink} href="/admin/leaderboards">
            <h2>Leaderboards</h2>
            <p>Track season leaders across batting, bowling, and points.</p>
            <span className={styles.cardCta}>View rankings →</span>
          </Link>

          <Link className={styles.cardLink} href="/admin/scoring">
            <h2>Scoring</h2>
            <p>Review scoring rules and refine points configuration.</p>
            <span className={styles.cardCta}>Update scoring →</span>
          </Link>
        </div>

        <div className={styles.insights}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Batting Momentum</h2>
                <p className={styles.muted}>Runs scored across the last 6 matches.</p>
              </div>
              <span className={styles.pill}>Runs</span>
            </div>
            <div className={styles.sparklineWrap}>
              <svg viewBox="0 0 100 100" className={styles.sparkline} aria-hidden="true">
                <polyline points={runPoints} className={styles.sparklineLine} />
              </svg>
              <div className={styles.sparklineAxis}>
                {runs.map((value, index) => (
                  <span key={`${value}-${index}`}>{value}</span>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Wickets by Match</h2>
                <p className={styles.muted}>Bowling impact from recent fixtures.</p>
              </div>
              <span className={styles.pillAlt}>Wickets</span>
            </div>
            <div className={styles.barChart}>
              {wickets.map((value, index) => (
                <div key={`${value}-${index}`} className={styles.barWrap}>
                  <div className={styles.bar} style={{ height: `${value * 10}%` }} />
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
