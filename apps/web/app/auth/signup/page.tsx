'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../auth.module.css'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up')
      }

      router.push('/admin/matches')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Sign Up</h1>
          <p className={styles.subtitle}>Create your Cricket Platform account.</p>
        </div>

        {error && <div className={styles.alert}>{error}</div>}

        <form onSubmit={handleSignUp} className={styles.form}>
          <label className={styles.fieldLabel}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.field}
              placeholder="you@example.com"
            />
          </label>

          <label className={styles.fieldLabel}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={styles.field}
              placeholder="••••••••"
            />
          </label>

          <label className={styles.fieldLabel}>
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className={styles.field}
              placeholder="••••••••"
            />
          </label>

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link href="/auth/signin" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
