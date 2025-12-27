'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function DashboardPage() {
  const router = useRouter()
  const { user, profile, loading, signOut } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-slate-900">MVP Cricket</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                {profile.name || profile.email}
              </span>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">
            Welcome, {profile.name}!
          </h2>
          <p className="text-slate-600 mt-2">
            {profile.organization?.name || 'Your Cricket Club'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Matches</CardTitle>
              <CardDescription>Your next fixtures</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">No upcoming matches</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Squad</CardTitle>
              <CardDescription>Your team members</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Role: <span className="font-medium capitalize">{profile.role}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Your current plan</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Plan: <span className="font-medium capitalize">
                  {profile.organization?.feature_flags?.tier || 'Free'}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with your club</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                Add a Match
              </Button>
              <Button className="w-full justify-start" variant="outline">
                Invite Players
              </Button>
              <Button className="w-full justify-start" variant="outline">
                View Statistics
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
