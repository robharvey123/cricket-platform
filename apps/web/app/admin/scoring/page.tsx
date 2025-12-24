'use client'

import { useEffect, useState } from 'react'
import { ScoringFormula, DEFAULT_FORMULA } from '../../../lib/scoring/engine'
import { calcBattingPoints, calcBowlingPoints, calcFieldingPoints } from '../../../lib/scoring/engine'

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
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <p>Loading scoring configuration...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
          Scoring Configuration
        </h1>
        <p style={{ color: '#6b7280' }}>
          Configure how points are calculated for batting, bowling, and fielding
        </p>
      </div>

      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #ef4444',
          padding: '16px',
          borderRadius: '6px',
          marginBottom: '24px'
        }}>
          <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      {success && (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #16a34a',
          padding: '16px',
          borderRadius: '6px',
          marginBottom: '24px'
        }}>
          <p style={{ color: '#16a34a', fontSize: '14px', margin: 0 }}>
            Configuration saved successfully!
          </p>
        </div>
      )}

      {calcSuccess && (
        <div style={{
          background: '#dbeafe',
          border: '1px solid #3b82f6',
          padding: '16px',
          borderRadius: '6px',
          marginBottom: '24px'
        }}>
          <p style={{ color: '#1d4ed8', fontSize: '14px', margin: 0 }}>
            {calcSuccess}
          </p>
        </div>
      )}

      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
          Configuration Name
        </label>
        <input
          type="text"
          value={configName}
          onChange={(e) => setConfigName(e.target.value)}
          placeholder="e.g., 2025 Season Scoring"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
        <button
          onClick={() => setJsonView(!jsonView)}
          style={{
            padding: '8px 16px',
            background: jsonView ? '#7c3aed' : '#f3f4f6',
            color: jsonView ? 'white' : '#1f2937',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          {jsonView ? 'Form View' : 'JSON View'}
        </button>
      </div>

      {jsonView ? (
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
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
            style={{
              width: '100%',
              height: '500px',
              fontFamily: 'monospace',
              fontSize: '13px',
              padding: '16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      ) : (
        <>
          {/* Batting Config */}
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              Batting Points
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Points per run
                </label>
                <input
                  type="number"
                  value={formula.batting.per_run}
                  onChange={(e) => updateFormula(['batting', 'per_run'], parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Points per 4
                </label>
                <input
                  type="number"
                  value={formula.batting.boundary_4}
                  onChange={(e) => updateFormula(['batting', 'boundary_4'], parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Points per 6
                </label>
                <input
                  type="number"
                  value={formula.batting.boundary_6}
                  onChange={(e) => updateFormula(['batting', 'boundary_6'], parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Duck penalty
                </label>
                <input
                  type="number"
                  value={formula.batting.duck_penalty}
                  onChange={(e) => updateFormula(['batting', 'duck_penalty'], parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                Milestones
              </label>
              {formula.batting.milestones.map((milestone, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                  <input
                    type="number"
                    value={milestone.at}
                    onChange={(e) => {
                      const newMilestones = [...formula.batting.milestones]
                      newMilestones[idx].at = parseInt(e.target.value)
                      updateFormula(['batting', 'milestones'], newMilestones)
                    }}
                    placeholder="Runs"
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
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
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bowling Config */}
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              Bowling Points
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Points per wicket
                </label>
                <input
                  type="number"
                  value={formula.bowling.per_wicket}
                  onChange={(e) => updateFormula(['bowling', 'per_wicket'], parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Points per maiden
                </label>
                <input
                  type="number"
                  value={formula.bowling.maiden_over}
                  onChange={(e) => updateFormula(['bowling', 'maiden_over'], parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  3-wicket bonus
                </label>
                <input
                  type="number"
                  value={formula.bowling.three_for_bonus || 0}
                  onChange={(e) => updateFormula(['bowling', 'three_for_bonus'], parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  5-wicket bonus
                </label>
                <input
                  type="number"
                  value={formula.bowling.five_for_bonus || 0}
                  onChange={(e) => updateFormula(['bowling', 'five_for_bonus'], parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Fielding Config */}
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              Fielding Points
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Points per catch
                </label>
                <input
                  type="number"
                  value={formula.fielding.catch}
                  onChange={(e) => updateFormula(['fielding', 'catch'], parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Points per stumping
                </label>
                <input
                  type="number"
                  value={formula.fielding.stumping}
                  onChange={(e) => updateFormula(['fielding', 'stumping'], parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Points per runout
                </label>
                <input
                  type="number"
                  value={formula.fielding.runout}
                  onChange={(e) => updateFormula(['fielding', 'runout'], parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Drop penalty
                </label>
                <input
                  type="number"
                  value={formula.fielding.drop_penalty}
                  onChange={(e) => updateFormula(['fielding', 'drop_penalty'], parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Misfield penalty
                </label>
                <input
                  type="number"
                  value={formula.fielding.misfield_penalty}
                  onChange={(e) => updateFormula(['fielding', 'misfield_penalty'], parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Preview */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          Preview
        </h2>
        <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#6b7280' }}>
          <p>Batting 72 runs (10x4, 2x6, 55 balls): <strong style={{ color: '#16a34a' }}>
            {calcBattingPoints(formula.batting, { runs: 72, balls: 55, fours: 10, sixes: 2 }).points} points
          </strong></p>
          <p>Bowling 8-2-24-3: <strong style={{ color: '#16a34a' }}>
            {calcBowlingPoints(formula.bowling, { overs: 8, maidens: 2, runs: 24, wickets: 3 }).points} points
          </strong></p>
          <p>Fielding 2 catches, 1 drop: <strong style={{ color: '#16a34a' }}>
            {calcFieldingPoints(formula.fielding, { catches: 2, stumpings: 0, runouts: 0, drops: 1, misfields: 0 }).points} points
          </strong></p>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={recalculatePoints}
          disabled={calculating}
          style={{
            padding: '10px 20px',
            background: calculating ? '#9ca3af' : '#0ea5e9',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: calculating ? 'not-allowed' : 'pointer'
          }}
        >
          {calculating ? 'Calculating...' : 'Recalculate All Points'}
        </button>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setFormula(DEFAULT_FORMULA)}
            style={{
              padding: '10px 20px',
              background: '#f3f4f6',
              color: '#1f2937',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Reset to Default
          </button>
          <button
            onClick={saveConfig}
            disabled={saving}
            style={{
              padding: '10px 20px',
              background: saving ? '#9ca3af' : '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  )
}
