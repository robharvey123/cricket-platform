'use client'

import { useEffect, useState } from 'react'
import { ScoringFormula, DEFAULT_FORMULA } from '../../../lib/scoring/engine'
import { calcBattingPoints, calcBowlingPoints, calcFieldingPoints } from '../../../lib/scoring/engine'
import styles from './page.module.css'

export default function ScoringConfigPage() {
  const [formula, setFormula] = useState<ScoringFormula>(DEFAULT_FORMULA)
  const [configName, setConfigName] = useState('Default Scoring')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [calcSuccess, setCalcSuccess] = useState<string | null>(null)
  const [jsonView, setJsonView] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/scoring/config')
      const data = await response.json()

      if (response.ok && data.config) {
        setFormula(data.config.formula)
        setConfigName(data.config.name)
      } else {
        // Use default if no config exists
        setFormula(DEFAULT_FORMULA)
        setConfigName('Default Scoring')
      }
    } catch (err: any) {
      console.error('Load error:', err)
      setFormula(DEFAULT_FORMULA)
      setConfigName('Default Scoring')
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/scoring/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: configName, formula }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const recalculatePoints = async () => {
    setCalculating(true)
    setError(null)
    setCalcSuccess(null)

    try {
      const response = await fetch('/api/scoring/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate points')
      }

      setCalcSuccess(`Successfully recalculated points for ${data.processed} match(es)`)
      setTimeout(() => setCalcSuccess(null), 5000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCalculating(false)
    }
  }

  const updateFormula = (path: string[], value: any) => {
    setFormula(prev => {
      const newFormula = JSON.parse(JSON.stringify(prev))
      let current: any = newFormula
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]]
      }
      current[path[path.length - 1]] = value
      return newFormula
    })
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loading}>Loading scoring configuration...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <span className={styles.kicker}>Club Settings</span>
          <h1 className={styles.title}>Scoring Configuration</h1>
          <p className={styles.subtitle}>
            Configure how points are calculated for batting, bowling, and fielding.
          </p>
        </header>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error}
          </div>
        )}

        {success && (
          <div className={`${styles.alert} ${styles.alertSuccess}`}>
            Configuration saved successfully!
          </div>
        )}

        {calcSuccess && (
          <div className={`${styles.alert} ${styles.alertInfo}`}>
            {calcSuccess}
          </div>
        )}

        <section className={styles.card}>
          <label className={styles.fieldLabel}>
            Configuration Name
            <input
              type="text"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="e.g., 2025 Season Scoring"
              className={styles.field}
            />
          </label>
        </section>

        <div className={styles.buttonRow}>
          <button
            onClick={() => setJsonView(!jsonView)}
            className={jsonView ? styles.primaryButton : styles.ghostButton}
          >
            {jsonView ? 'Form View' : 'JSON View'}
          </button>
        </div>

        {jsonView ? (
          <section className={styles.card}>
            <textarea
              value={JSON.stringify(formula, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  setFormula(parsed)
                  setError(null)
                } catch (err) {
                  setError('Invalid JSON')
                }
              }}
              className={styles.textarea}
            />
          </section>
        ) : (
          <>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Batting Points</h2>
                <p>Reward runs, boundaries, and milestones.</p>
              </div>
              <div className={styles.formGrid}>
                <label className={styles.fieldLabel}>
                  Points per run
                  <input
                    type="number"
                    value={formula.batting.per_run}
                    onChange={(e) => updateFormula(['batting', 'per_run'], parseFloat(e.target.value))}
                    className={styles.field}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Points per 4
                  <input
                    type="number"
                    value={formula.batting.boundary_4}
                    onChange={(e) => updateFormula(['batting', 'boundary_4'], parseFloat(e.target.value))}
                    className={styles.field}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Points per 6
                  <input
                    type="number"
                    value={formula.batting.boundary_6}
                    onChange={(e) => updateFormula(['batting', 'boundary_6'], parseFloat(e.target.value))}
                    className={styles.field}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Duck penalty
                  <input
                    type="number"
                    value={formula.batting.duck_penalty}
                    onChange={(e) => updateFormula(['batting', 'duck_penalty'], parseFloat(e.target.value))}
                    className={styles.field}
                  />
                </label>
              </div>

              <div className={styles.sectionBlock}>
                <h3>Milestones</h3>
                <div className={styles.milestoneList}>
                  {formula.batting.milestones.map((milestone, idx) => (
                    <div key={idx} className={styles.milestoneRow}>
                      <input
                        type="number"
                        value={milestone.at}
                        onChange={(e) => {
                          const newMilestones = [...formula.batting.milestones]
                          newMilestones[idx].at = parseInt(e.target.value)
                          updateFormula(['batting', 'milestones'], newMilestones)
                        }}
                        placeholder="Runs"
                        className={styles.field}
                      />
                      <input
                        type="number"
                        value={milestone.bonus}
                        onChange={(e) => {
                          const newMilestones = [...formula.batting.milestones]
                          newMilestones[idx].bonus = parseInt(e.target.value)
                          updateFormula(['batting', 'milestones'], newMilestones)
                        }}
                        placeholder="Bonus"
                        className={styles.field}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Bowling Points</h2>
                <p>Keep wicket hauls and economy bonuses balanced.</p>
              </div>
              <div className={styles.formGrid}>
                <label className={styles.fieldLabel}>
                  Points per wicket
                  <input
                    type="number"
                    value={formula.bowling.per_wicket}
                    onChange={(e) => updateFormula(['bowling', 'per_wicket'], parseFloat(e.target.value))}
                    className={styles.field}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Points per maiden
                  <input
                    type="number"
                    value={formula.bowling.maiden_over}
                    onChange={(e) => updateFormula(['bowling', 'maiden_over'], parseFloat(e.target.value))}
                    className={styles.field}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  3-wicket bonus
                  <input
                    type="number"
                    value={formula.bowling.three_for_bonus || 0}
                    onChange={(e) => updateFormula(['bowling', 'three_for_bonus'], parseFloat(e.target.value))}
                    className={styles.field}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  5-wicket bonus
                  <input
                    type="number"
                    value={formula.bowling.five_for_bonus || 0}
                    onChange={(e) => updateFormula(['bowling', 'five_for_bonus'], parseFloat(e.target.value))}
                    className={styles.field}
                  />
                </label>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Fielding Points</h2>
                <p>Reward athletic fielding and limit penalties.</p>
              </div>
              <div className={styles.formGrid}>
                <label className={styles.fieldLabel}>
                  Points per catch
                  <input
                    type="number"
                    value={formula.fielding.catch}
                    onChange={(e) => updateFormula(['fielding', 'catch'], parseFloat(e.target.value))}
                    className={styles.field}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Points per stumping
                  <input
                    type="number"
                    value={formula.fielding.stumping}
                    onChange={(e) => updateFormula(['fielding', 'stumping'], parseFloat(e.target.value))}
                    className={styles.field}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Points per runout
                  <input
                    type="number"
                    value={formula.fielding.runout}
                    onChange={(e) => updateFormula(['fielding', 'runout'], parseFloat(e.target.value))}
                    className={styles.field}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Drop penalty
                  <input
                    type="number"
                    value={formula.fielding.drop_penalty}
                    onChange={(e) => updateFormula(['fielding', 'drop_penalty'], parseFloat(e.target.value))}
                    className={styles.field}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Misfield penalty
                  <input
                    type="number"
                    value={formula.fielding.misfield_penalty}
                    onChange={(e) => updateFormula(['fielding', 'misfield_penalty'], parseFloat(e.target.value))}
                    className={styles.field}
                  />
                </label>
              </div>
            </section>
          </>
        )}

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Preview</h2>
            <p>Sanity check the scoring outputs for common scenarios.</p>
          </div>
          <div className={styles.preview}>
            <p>
              Batting 72 runs (10x4, 2x6, 55 balls):{' '}
              <strong>
                {calcBattingPoints(formula.batting, { runs: 72, balls: 55, fours: 10, sixes: 2 }).points}{' '}
                points
              </strong>
            </p>
            <p>
              Bowling 8-2-24-3:{' '}
              <strong>
                {calcBowlingPoints(formula.bowling, { overs: 8, maidens: 2, runs: 24, wickets: 3 }).points}{' '}
                points
              </strong>
            </p>
            <p>
              Fielding 2 catches, 1 drop:{' '}
              <strong>
                {calcFieldingPoints(formula.fielding, { catches: 2, stumpings: 0, runouts: 0, drops: 1, misfields: 0 }).points}{' '}
                points
              </strong>
            </p>
          </div>
        </section>

        <div className={styles.actionBar}>
          <button
            onClick={recalculatePoints}
            disabled={calculating}
            className={styles.secondaryButton}
          >
            {calculating ? 'Calculating...' : 'Recalculate All Points'}
          </button>

          <div className={styles.actionGroup}>
            <button
              onClick={() => setFormula(DEFAULT_FORMULA)}
              className={styles.ghostButton}
            >
              Reset to Default
            </button>
            <button
              onClick={saveConfig}
              disabled={saving}
              className={styles.primaryButton}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
