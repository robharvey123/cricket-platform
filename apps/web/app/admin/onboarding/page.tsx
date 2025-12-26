'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

interface Club {
  id: string;
  name: string;
  slug: string;
}

interface OnboardingProgress {
  hasTeams: boolean;
  hasSeason: boolean;
  hasPlayers: number;
  hasCaptains: boolean;
  hasMatches: boolean;
}

export default function OnboardingPage() {
  const router = useRouter()
  const [club, setClub] = useState<Club | null>(null)
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    fetchOnboardingStatus()
  }, [])

  async function fetchOnboardingStatus() {
    try {
      const response = await fetch('/api/onboarding/status')
      if (response.ok) {
        const data = await response.json()
        setClub(data.club)
        setProgress(data.progress)

        // Auto-advance to appropriate step
        if (!data.progress.hasTeams) setCurrentStep(1)
        else if (!data.progress.hasSeason) setCurrentStep(2)
        else if (data.progress.hasPlayers === 0) setCurrentStep(3)
        else if (!data.progress.hasCaptains) setCurrentStep(4)
        else setCurrentStep(5)
      }
    } catch (error) {
      console.error('Failed to fetch onboarding status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loading}>Loading onboarding...</div>
        </div>
      </div>
    )
  }

  const steps = [
    {
      number: 1,
      title: 'Create Your Team',
      description: 'Set up your first cricket team',
      completed: progress?.hasTeams || false,
      action: '/admin/teams',
    },
    {
      number: 2,
      title: 'Create a Season',
      description: 'Define your current playing season',
      completed: progress?.hasSeason || false,
      action: '/admin/seasons',
    },
    {
      number: 3,
      title: 'Add Players',
      description: 'Create player profiles and invite them to join',
      completed: (progress?.hasPlayers || 0) > 0,
      action: '/admin/players',
    },
    {
      number: 4,
      title: 'Assign Team Captains',
      description: 'Give captains access to manage matches',
      completed: progress?.hasCaptains || false,
      action: '/admin/teams',
    },
    {
      number: 5,
      title: 'Start Recording Matches',
      description: 'Upload scorecards or create matches manually',
      completed: progress?.hasMatches || false,
      action: '/admin/matches',
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Welcome to {club?.name || 'Your Cricket Club'}! 🏏
          </h1>
          <p className={styles.subtitle}>
            Let&apos;s get your club set up in 5 simple steps
          </p>
        </div>

        <section className={styles.stepsCard}>
          <div className={styles.stepList}>
            {steps.map((step, index) => {
              const cardClass = step.completed
                ? styles.stepCardComplete
                : currentStep === step.number
                  ? styles.stepCardActive
                  : styles.stepCardIdle

              return (
                <div key={step.number}>
                  <div className={`${styles.stepCard} ${cardClass}`}>
                    <div
                      className={`${styles.stepBadge} ${
                        step.completed
                          ? styles.stepBadgeComplete
                          : currentStep === step.number
                            ? styles.stepBadgeActive
                            : ''
                      }`}
                    >
                      {step.completed ? '✓' : step.number}
                    </div>

                    <div className={styles.stepContent}>
                      <h3 className={styles.stepTitle}>{step.title}</h3>
                      <p className={styles.stepDescription}>{step.description}</p>

                      {currentStep === step.number && !step.completed && (
                        <div>
                          {step.number === 3 && <PlayerInviteInstructions />}
                          <Link href={step.action} className={styles.stepAction}>
                            {step.completed ? 'View' : 'Get Started →'}
                          </Link>
                        </div>
                      )}

                      {step.completed && (
                        <Link href={step.action} className={styles.stepManage}>
                          Manage →
                        </Link>
                      )}
                    </div>
                  </div>
                  {index < steps.length - 1 && <div className={styles.connector} />}
                </div>
              )
            })}
          </div>
        </section>

        <section className={styles.quickCard}>
          <h2 className={styles.cardTitle}>Quick Actions</h2>
          <div className={styles.quickGrid}>
            <Link href="/admin/players/invite" className={styles.quickItem}>
              <div className={styles.quickTitle}>📧 Invite Players</div>
              <div className={styles.quickSubtitle}>
                Send email & WhatsApp invitations to your squad
              </div>
            </Link>
            <Link href="/admin/matches/import-pdf" className={styles.quickItem}>
              <div className={styles.quickTitle}>📄 Import Scorecard</div>
              <div className={styles.quickSubtitle}>
                Upload a PDF from Play Cricket
              </div>
            </Link>
            <Link href="/admin/scoring" className={styles.quickItem}>
              <div className={styles.quickTitle}>⚙️ Configure Scoring</div>
              <div className={styles.quickSubtitle}>
                Customize your points system
              </div>
            </Link>
            <Link href="/admin" className={styles.quickItem}>
              <div className={styles.quickTitle}>📊 View Dashboard</div>
              <div className={styles.quickSubtitle}>
                See your club analytics
              </div>
            </Link>
          </div>
        </section>

        <Link href="/admin" className={styles.skipLink}>
          Skip onboarding and go to dashboard →
        </Link>
      </div>
    </div>
  )
}

function PlayerInviteInstructions() {
  return (
    <div className={styles.infoBox}>
      <strong>📱 How to invite players:</strong>
      <ol>
        <li>
          <strong>Add players manually:</strong> Create player profiles with their names
        </li>
        <li>
          <strong>Send invitations:</strong> Use the "Invite Players" page to send email & WhatsApp links
        </li>
        <li>
          <strong>Players accept:</strong> They click the link to create their account
        </li>
        <li>
          <strong>Link profiles:</strong> System automatically links their account to their player profile
        </li>
      </ol>
      <div className={styles.infoExample}>
        <p><strong>💡 Pro Tip:</strong> Players will receive a personalized invitation like this:</p>
        <p>Subject: Join {'{Club Name}'} on Cricket Platform</p>
        <p>
          &quot;You&apos;ve been invited to join {'{Club Name}'}! Click here to view your stats,
          track your performance, and compete on the leaderboard: [Join Link]&quot;
        </p>
      </div>
    </div>
  )
}
