'use client'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
          <CardDescription>We've sent a verification link to your email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-blue-900 font-medium">{email}</p>
          </div>

          <div className="space-y-2 text-sm text-slate-600">
            <p>Click the verification link in your email to activate your account.</p>
            <p>The link will expire in 24 hours.</p>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600 text-center">
              Didn't receive the email?{' '}
              <button className="text-blue-600 hover:underline">Resend</button>
            </p>
            <p className="text-sm text-slate-600 text-center mt-2">
              <Link href="/login" className="text-blue-600 hover:underline">
                Back to login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
