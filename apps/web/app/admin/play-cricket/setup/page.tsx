'use client'

import { useEffect, useState } from 'react'
import { useUserRole } from '../../../../lib/hooks/useUserRole'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

interface Club {
  id: string
  name: string
  play_cricket_site_id: string | null
  play_cricket_api_token: string | null
  play_cricket_sync_enabled: boolean
  play_cricket_last_sync: string | null
}

export default function PlayCricketSetupPage() {
  const router = useRouter()
  const { role, clubId, loading: roleLoading } = useUserRole()
  const [club, setClub] = useState<Club | null>(null)
  const [siteId, setSiteId] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [testingConnection, setTestingConnection] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [step, setStep] = useState(1)

  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      router.push('/admin')
    }
  }, [role, roleLoading, router])

  useEffect(() => {
    if (!roleLoading) {
      fetchClubConfig()
    }
  }, [roleLoading])

  async function fetchClubConfig() {
    try {
      const response = await fetch('/api/club/info')
      if (response.ok) {
        const data = await response.json()
        setClub(data.club)
        setSiteId(data.club.play_cricket_site_id || '')

        // If already configured, skip to step 3
        if (data.club.play_cricket_site_id && data.club.play_cricket_api_token) {
          setStep(3)
        }
      }
    } catch (error) {
      console.error('Failed to fetch club config:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleTestConnection() {
    if (!siteId || !apiToken) {
      setMessage({ type: 'error', text: 'Please enter both Site ID and API Token' })
      return
    }

    setTestingConnection(true)
    setMessage(null)

    try {
      const response = await fetch('/api/play-cricket/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, apiToken, clubId }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Connection successful! Your credentials have been saved.' })
        setStep(3)
        fetchClubConfig()
      } else {
        setMessage({ type: 'error', text: data.error || 'Connection failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to test connection' })
    } finally {
      setTestingConnection(false)
    }
  }

  if (roleLoading || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </div>
    )
  }

  if (role !== 'admin') {
    return null
  }

  const isConfigured = club?.play_cricket_site_id && club?.play_cricket_api_token

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Integration Setup</p>
            <h1 className={styles.title}>Play Cricket Setup</h1>
            <p className={styles.subtitle}>
              Connect your club to Play Cricket and import match data automatically
            </p>
          </div>
        </div>

        {message && (
          <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage}>
            {message.text}
          </div>
        )}

        {/* Progress Steps */}
        <div className={styles.progressSteps}>
          <div className={`${styles.progressStep} ${step >= 1 ? styles.progressStepActive : ''}`}>
            <div className={styles.progressStepNumber}>1</div>
            <div className={styles.progressStepLabel}>What is Play Cricket?</div>
          </div>
          <div className={styles.progressStepLine} />
          <div className={`${styles.progressStep} ${step >= 2 ? styles.progressStepActive : ''}`}>
            <div className={styles.progressStepNumber}>2</div>
            <div className={styles.progressStepLabel}>Get Credentials</div>
          </div>
          <div className={styles.progressStepLine} />
          <div className={`${styles.progressStep} ${step >= 3 ? styles.progressStepActive : ''}`}>
            <div className={styles.progressStepNumber}>3</div>
            <div className={styles.progressStepLabel}>Configure</div>
          </div>
        </div>

        {/* Step 1: Introduction */}
        {step === 1 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>What is Play Cricket?</h2>

            <div className={styles.infoBox}>
              <div className={styles.infoIcon}>🏏</div>
              <div>
                <p className={styles.infoText}>
                  <strong>Play Cricket</strong> is the official platform of the ECB (England and Wales Cricket Board)
                  for managing cricket clubs, leagues, and matches across the UK.
                </p>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>What This Integration Does</h3>
            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>✅</span>
                <div>
                  <h4>Automatic Match Import</h4>
                  <p>Import all your matches from Play Cricket with one click</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>📊</span>
                <div>
                  <h4>Full Scorecards</h4>
                  <p>Get complete batting, bowling, and fielding statistics</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>👥</span>
                <div>
                  <h4>Player Matching</h4>
                  <p>Automatically match players or create new profiles</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>📅</span>
                <div>
                  <h4>Historical Data</h4>
                  <p>Import previous seasons to build your club's history</p>
                </div>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>Benefits</h3>
            <ul className={styles.benefitsList}>
              <li>Save hours of manual data entry</li>
              <li>Ensure accuracy with official match data</li>
              <li>Keep your platform in sync with Play Cricket</li>
              <li>Access comprehensive statistics instantly</li>
            </ul>

            <div className={styles.actionButtons}>
              <button onClick={() => setStep(2)} className={styles.primaryButton}>
                Next: Get Your Credentials →
              </button>
              <Link href="/admin/settings" className={styles.secondaryButton}>
                Back to Settings
              </Link>
            </div>
          </div>
        )}

        {/* Step 2: Get Credentials */}
        {step === 2 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Get Your Play Cricket Credentials</h2>

            <div className={styles.warningBox}>
              <div className={styles.warningIcon}>⚠️</div>
              <div>
                <p className={styles.warningText}>
                  <strong>Important:</strong> You need to contact Play Cricket support to get API access.
                  This cannot be done through their website.
                </p>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>Step 2.1: Find Your Site ID</h3>
            <div className={styles.instructionBox}>
              <ol className={styles.instructionList}>
                <li>
                  Go to <a href="https://play-cricket.com" target="_blank" rel="noopener noreferrer" className={styles.link}>
                    play-cricket.com
                  </a>
                </li>
                <li>Navigate to your club's page</li>
                <li>Look at the URL in your browser's address bar</li>
                <li>Find the number after <code>id=</code></li>
              </ol>

              <div className={styles.exampleBox}>
                <p className={styles.exampleLabel}>Example URL:</p>
                <code className={styles.exampleCode}>
                  https://play-cricket.com/website/club_info.asp?id=<strong className={styles.highlight}>1234</strong>
                </code>
                <p className={styles.exampleNote}>Your Site ID would be: <strong>1234</strong></p>
              </div>
            </div>

            <h3 className={styles.subsectionTitle}>Step 2.2: Request API Token</h3>
            <div className={styles.instructionBox}>
              <ol className={styles.instructionList}>
                <li>Email Play Cricket support at <a href="mailto:support@ecb.co.uk" className={styles.link}>support@ecb.co.uk</a></li>
                <li>Request API access for your club</li>
                <li>Provide your club name and Site ID</li>
                <li>Sign the API usage agreement they send</li>
                <li>Wait for them to issue your API token (usually 1-2 business days)</li>
              </ol>

              <div className={styles.emailTemplate}>
                <p className={styles.emailTemplateLabel}>📧 Email Template:</p>
                <div className={styles.emailTemplateBox}>
                  <p><strong>Subject:</strong> API Access Request for [Your Club Name]</p>
                  <p><strong>Body:</strong></p>
                  <p className={styles.emailTemplateBody}>
                    Hello,<br/><br/>
                    I would like to request API access for our cricket club to integrate with our club management platform.<br/><br/>
                    Club Name: [Your Club Name]<br/>
                    Site ID: [Your Site ID]<br/><br/>
                    Please send me the API usage agreement and let me know the next steps.<br/><br/>
                    Thank you,<br/>
                    [Your Name]
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.actionButtons}>
              <button onClick={() => setStep(3)} className={styles.primaryButton}>
                I Have My Credentials →
              </button>
              <button onClick={() => setStep(1)} className={styles.secondaryButton}>
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Configure */}
        {step === 3 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Configure Play Cricket Integration</h2>
            <p className={styles.sectionDescription}>
              Enter your credentials below to connect Cricket MVP to Play Cricket
            </p>

            <div className={styles.configForm}>
              <div className={styles.formGroup}>
                <label htmlFor="siteId" className={styles.label}>
                  Play Cricket Site ID <span className={styles.required}>*</span>
                </label>
                <input
                  id="siteId"
                  type="text"
                  className={styles.input}
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  placeholder="e.g., 1234"
                  disabled={testingConnection}
                />
                <p className={styles.hint}>
                  The numeric ID from your Play Cricket club URL
                </p>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="apiToken" className={styles.label}>
                  API Token <span className={styles.required}>*</span>
                </label>
                <input
                  id="apiToken"
                  type="password"
                  className={styles.input}
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Enter your API token from ECB"
                  disabled={testingConnection}
                />
                <p className={styles.hint}>
                  The API token provided by Play Cricket support
                </p>
              </div>

              <div className={styles.formActions}>
                <button
                  onClick={handleTestConnection}
                  disabled={testingConnection || !siteId || !apiToken}
                  className={styles.primaryButton}
                >
                  {testingConnection ? (
                    <>
                      <span className={styles.spinner} />
                      Testing Connection...
                    </>
                  ) : isConfigured ? (
                    'Update & Test Connection'
                  ) : (
                    'Test Connection'
                  )}
                </button>
                {!isConfigured && (
                  <button onClick={() => setStep(2)} className={styles.secondaryButton}>
                    ← Back
                  </button>
                )}
              </div>

              {isConfigured && (
                <div className={styles.successBox}>
                  <div className={styles.successIcon}>✓</div>
                  <div>
                    <h4 className={styles.successBoxTitle}>Integration Active</h4>
                    <p className={styles.successBoxText}>
                      Your club is connected to Play Cricket
                    </p>
                    {club?.play_cricket_last_sync && (
                      <p className={styles.successBoxMeta}>
                        Last sync: {new Date(club.play_cricket_last_sync).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {isConfigured && (
              <div className={styles.nextStepsSection}>
                <h3 className={styles.subsectionTitle}>🎉 You're All Set!</h3>
                <p className={styles.nextStepsText}>
                  Your Play Cricket integration is now configured. Here's what you can do next:
                </p>

                <div className={styles.nextStepsGrid}>
                  <Link href="/admin/play-cricket" className={styles.nextStepCard}>
                    <div className={styles.nextStepIcon}>📥</div>
                    <h4>Import Matches</h4>
                    <p>Start importing your matches from Play Cricket</p>
                    <span className={styles.nextStepArrow}>Go to Import →</span>
                  </Link>

                  <Link href="/admin/matches" className={styles.nextStepCard}>
                    <div className={styles.nextStepIcon}>🏏</div>
                    <h4>View Matches</h4>
                    <p>See all your imported matches and scorecards</p>
                    <span className={styles.nextStepArrow}>View Matches →</span>
                  </Link>

                  <Link href="/admin/leaderboards" className={styles.nextStepCard}>
                    <div className={styles.nextStepIcon}>🏆</div>
                    <h4>Check Leaderboards</h4>
                    <p>View updated player rankings and stats</p>
                    <span className={styles.nextStepArrow}>View Leaderboards →</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className={styles.helpSection}>
          <h3>Need Help?</h3>
          <div className={styles.helpGrid}>
            <div className={styles.helpCard}>
              <div className={styles.helpCardIcon}>📧</div>
              <h4>Play Cricket Support</h4>
              <p>For API access and technical issues</p>
              <a href="mailto:support@ecb.co.uk" className={styles.helpCardLink}>
                support@ecb.co.uk
              </a>
            </div>
            <div className={styles.helpCard}>
              <div className={styles.helpCardIcon}>📚</div>
              <h4>Documentation</h4>
              <p>View integration guides and FAQ</p>
              <a href="/docs/play-cricket" className={styles.helpCardLink}>
                View Docs →
              </a>
            </div>
            <div className={styles.helpCard}>
              <div className={styles.helpCardIcon}>💬</div>
              <h4>Cricket MVP Support</h4>
              <p>Get help from our team</p>
              <a href="mailto:support@cricketmvp.com" className={styles.helpCardLink}>
                Contact Support →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
