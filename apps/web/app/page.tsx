import Link from 'next/link'
import styles from './page.module.css'

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />

      {/* Hero Section */}
      <main className={styles.hero}>
        <div className={styles.copy}>
          <span className={styles.kicker}>Club Operations Suite</span>
          <h1 className={styles.title}>Cricket MVP</h1>
          <p className={styles.subtitle}>
            Run fixtures, scorecards, and player performance in one calm, focused workspace.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/auth/signup">
              Get Started Free
            </Link>
            <Link className={styles.secondary} href="/auth/signin">
              Sign In
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

      {/* Features Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.kicker}>Features</span>
          <h2 className={styles.sectionTitle}>Built for Cricket Clubs</h2>
          <p className={styles.sectionSubtitle}>
            Everything you need to manage your club, track performance, and engage players.
          </p>
        </div>
        <div className={styles.featureGrid}>
          <article className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Advanced Statistics</h3>
            <p>Deep dive into batting averages, bowling economy, strike rates, and more with customizable scoring configurations.</p>
          </article>
          <article className={styles.featureCard}>
            <div className={styles.featureIcon}>🏏</div>
            <h3>Match Management</h3>
            <p>Create matches manually or import from PDFs. Track scores, wickets, and player performances in real-time.</p>
          </article>
          <article className={styles.featureCard}>
            <div className={styles.featureIcon}>👥</div>
            <h3>Player Profiles</h3>
            <p>Comprehensive player records with career stats, recent form, and performance trends across seasons.</p>
          </article>
          <article className={styles.featureCard}>
            <div className={styles.featureIcon}>🏆</div>
            <h3>Leaderboards</h3>
            <p>Automatic rankings for batting, bowling, and fielding. Motivate your players with live standings.</p>
          </article>
          <article className={styles.featureCard}>
            <div className={styles.featureIcon}>👔</div>
            <h3>Role-Based Access</h3>
            <p>Admin, captain, and player roles with appropriate permissions for secure club management.</p>
          </article>
          <article className={styles.featureCard}>
            <div className={styles.featureIcon}>📱</div>
            <h3>Mobile Friendly</h3>
            <p>Access your club data anywhere. Optimized for phones, tablets, and desktop.</p>
          </article>
        </div>
      </section>

      {/* Pricing Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.kicker}>Pricing</span>
          <h2 className={styles.sectionTitle}>Simple, Transparent Pricing</h2>
          <p className={styles.sectionSubtitle}>
            Choose the plan that works for your club
          </p>
        </div>
        <div className={styles.pricingGrid}>
          <div className={styles.pricingCard}>
            <div className={styles.pricingHeader}>
              <h3>Free</h3>
              <div className={styles.price}>
                <span className={styles.priceAmount}>£0</span>
                <span className={styles.pricePeriod}>/month</span>
              </div>
            </div>
            <ul className={styles.featureList}>
              <li>Up to 20 players</li>
              <li>5 matches per season</li>
              <li>Basic statistics</li>
              <li>Single team</li>
              <li>Community support</li>
            </ul>
            <Link href="/auth/signup" className={styles.pricingButton}>
              Get Started
            </Link>
          </div>

          <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
            <div className={styles.badge}>Most Popular</div>
            <div className={styles.pricingHeader}>
              <h3>Club</h3>
              <div className={styles.price}>
                <span className={styles.priceAmount}>£29</span>
                <span className={styles.pricePeriod}>/month</span>
              </div>
            </div>
            <ul className={styles.featureList}>
              <li>Unlimited players</li>
              <li>Unlimited matches</li>
              <li>Advanced statistics</li>
              <li>Multiple teams</li>
              <li>Player invitations</li>
              <li>Custom scoring configs</li>
              <li>Priority support</li>
            </ul>
            <Link href="/auth/signup" className={styles.pricingButtonPrimary}>
              Start Free Trial
            </Link>
          </div>

          <div className={styles.pricingCard}>
            <div className={styles.pricingHeader}>
              <h3>League</h3>
              <div className={styles.price}>
                <span className={styles.priceAmount}>£99</span>
                <span className={styles.pricePeriod}>/month</span>
              </div>
            </div>
            <ul className={styles.featureList}>
              <li>Everything in Club</li>
              <li>Multiple clubs</li>
              <li>League management</li>
              <li>Public leaderboards</li>
              <li>API access</li>
              <li>White-label options</li>
              <li>Dedicated support</li>
            </ul>
            <Link href="/auth/signup" className={styles.pricingButton}>
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.kicker}>FAQ</span>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
        </div>
        <div className={styles.faqGrid}>
          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>How does the PDF import work?</summary>
            <p className={styles.faqAnswer}>
              Upload match scorecards in PDF format and our system automatically extracts player names, scores, wickets, and other statistics. You can then review and edit the data before saving.
            </p>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>Can I manage multiple teams?</summary>
            <p className={styles.faqAnswer}>
              Yes! The Club and League plans support multiple teams. You can track different squads, age groups, or competitive levels all within one club.
            </p>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>How do player invitations work?</summary>
            <p className={styles.faqAnswer}>
              Admins can invite players via email. Players receive an invitation link to join your club, create their profile, and view their personal statistics.
            </p>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>What statistics do you track?</summary>
            <p className={styles.faqAnswer}>
              We track comprehensive batting stats (runs, average, strike rate, boundaries), bowling stats (wickets, economy, average), fielding stats (catches, stumpings), and much more. You can customize scoring configurations too.
            </p>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>Is there a free trial?</summary>
            <p className={styles.faqAnswer}>
              Yes! The Club plan includes a 14-day free trial with full access to all features. No credit card required to start.
            </p>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>Can players access their own stats?</summary>
            <p className={styles.faqAnswer}>
              Absolutely! Players can log in to view their personal statistics, performance trends, match history, and see how they rank on the leaderboards.
            </p>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>What happens to my data if I cancel?</summary>
            <p className={styles.faqAnswer}>
              You can export all your data at any time. After cancellation, your data is retained for 30 days in case you want to reactivate. After that, it's permanently deleted.
            </p>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>Do you offer support?</summary>
            <p className={styles.faqAnswer}>
              Yes! Free plans have community support, Club plans get priority email support, and League plans receive dedicated support with faster response times.
            </p>
          </details>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Ready to transform your club?</h2>
          <p className={styles.ctaSubtitle}>
            Join cricket clubs already using our platform to manage their seasons.
          </p>
          <Link href="/auth/signup" className={styles.ctaButton}>
            Start Your Free Trial
          </Link>
        </div>
      </section>
    </div>
  )
}
