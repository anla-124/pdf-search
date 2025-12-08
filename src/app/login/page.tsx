'use client'

import { GoogleAuthButton, EmailPasswordLogin } from '@/components/auth/oauth-buttons'
import { Card, CardContent } from '@/components/ui/card'
import Image from 'next/image'
import { useState, useEffect } from 'react'

export default function LoginPage() {
  // Check if we're in local development mode (only on client to avoid hydration mismatch)
  const [isLocalDev, setIsLocalDev] = useState(false)

  useEffect(() => {
    setIsLocalDev(
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '127.0.2.2' ||
      window.location.hostname === '192.168.169.53' ||
      window.location.hostname === '192.168.1.106' ||
      window.location.hostname === '0.0.0.0'
    )
  }, [])

  return (
    <div
      className="min-h-screen flex items-center justify-center transition-colors duration-300 relative"
      style={{
        backgroundImage: 'url(/logo/background-v3.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Logo at top left */}
      <div className="absolute top-8 left-8">
        <Image
          src="/logo/short-logo-white.svg"
          alt="PDF Search Logo"
          width={90}
          height={30}
          className="h-8 w-auto"
          priority
        />
      </div>

      <div className="w-full max-w-md px-4">
        <Card className="shadow-xl border-0 bg-white">
          <CardContent className="pt-8 pb-8 px-8">
            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Welcome to PDF Search</h1>

            {isLocalDev && (
              <>
                {/* Email Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter email address
                  </label>
                  <EmailPasswordLogin />
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 text-gray-500">
                      OR
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Google Button */}
            <GoogleAuthButton />

            {!isLocalDev && (
              <p className="text-center text-sm text-gray-600 mt-6">
                Log in with your Google account to get started
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
