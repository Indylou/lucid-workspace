import React, { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Alert, AlertDescription } from '../components/ui/alert'
import { loginUser } from '../lib/auth-service'
import { useNavigate, Link } from 'react-router-dom'
import { useUser } from '../lib/user-context'
import AuthLayout from '../components/layout/AuthLayout'

export function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useUser()
  const [email, setEmail] = useState('indy@watchlucid.com')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setIsLoading(true)

    try {
      console.log('Login page: Attempting login for', email)
      setMessage('Attempting login...')
      
      const { user, error } = await loginUser({ email, password })

      if (error || !user) {
        console.error('Login page: Login failed', error)
        setError(error ? error.message || 'Failed to login' : 'Failed to login')
        setIsLoading(false)
        return
      }

      console.log('Login page: Login successful', user)
      setMessage('Login successful! Redirecting...')
      
      // Update user context
      setUser(user)
      
      // Redirect to dashboard
      navigate('/dashboard')
    } catch (err) {
      console.error('Login page: Unexpected error', err)
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="pt-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Note: Due to Supabase authentication issues, we're using a simplified login process that creates a user record if one doesn't exist.</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
} 