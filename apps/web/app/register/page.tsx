'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    clubName: '',
    name: '',
    email: '',
    password: '',
    pcSiteId: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await signUp(formData.email, formData.password, {
        name: formData.name,
        clubName: formData.clubName,
        pcSiteId: formData.pcSiteId || undefined,
      })

      if (error) throw error

      // Redirect to verification page
      router.push('/verify-email?email=' + encodeURIComponent(formData.email))
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Your Club</CardTitle>
          <CardDescription>Get started with MVP Cricket in minutes</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="clubName">Club Name *</Label>
              <Input
                id="clubName"
                value={formData.clubName}
                onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                placeholder="e.g. Brookweald Cricket Club"
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rob Harvey"
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                minLength={8}
                required
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <Label htmlFor="pcSiteId">Play-Cricket Site ID (optional)</Label>
              <Input
                id="pcSiteId"
                value={formData.pcSiteId}
                onChange={(e) => setFormData({ ...formData, pcSiteId: e.target.value })}
                placeholder="e.g. 3540"
                disabled={loading}
              />
              <p className="text-sm text-slate-500 mt-1">
                Find this at the bottom of your Play-Cricket club page.
                <br />
                Example URL: play-cricket.com/website/results/<strong>3540</strong>
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Club...' : 'Create Club'}
            </Button>

            <p className="text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
