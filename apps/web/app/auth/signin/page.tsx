'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../auth.module.css'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign in')
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
          <h1 className={styles.title}>Sign In</h1>
          <p className={styles.subtitle}>Welcome back to Cricket Platform.</p>
        </div>

        {error && <div className={styles.alert}>{error}</div>}

        <form onSubmit={handleSignIn} className={styles.form}>
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
              className={styles.field}
              placeholder="••••••••"
            />
          </label>

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className={styles.footer}>
          Don't have an account?{' '}
          <Link href="/auth/signup" className={styles.link}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
