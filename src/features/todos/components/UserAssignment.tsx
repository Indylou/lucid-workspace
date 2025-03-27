import React, { useEffect, useState, useRef, useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar"
import { supabase, adminSupabase } from '../../../lib/supabase'

interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
}

interface UserAssignmentProps {
  userId: string
}

// Cache to store users by ID to reduce repeated requests
const userCache: Record<string, User> = {};

export function UserAssignment({ userId }: UserAssignmentProps) {
  const [user, setUser] = useState<User | null>(null)
  const fetchedRef = useRef(false)

  // Memoize the user ID to prevent repeated fetches
  const memoUserId = useMemo(() => userId, [userId])

  useEffect(() => {
    // Only fetch if we have a valid user ID
    if (!memoUserId) {
      setUser(null)
      return
    }
    
    // Check if user is already in cache
    if (userCache[memoUserId]) {
      setUser(userCache[memoUserId])
      return
    }
    
    // Only fetch once per component instance for the same user ID
    if (fetchedRef.current && user?.id === memoUserId) {
      return
    }
    
    const fetchUser = async () => {
      try {
        fetchedRef.current = true
        
        const { data, error } = await adminSupabase
          .from('users')
          .select('id, email, name, avatar_url')
          .eq('id', memoUserId)
          .single()

        if (error) throw error
        
        // Store in cache
        if (data) {
          userCache[memoUserId] = data
        }
        
        setUser(data)
      } catch (error) {
        console.error('Error fetching user:', error)
      }
    }

    fetchUser()
    
    // Clean up function
    return () => {
      fetchedRef.current = false
    }
  }, [memoUserId])

  if (!user) return null

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
      <Avatar className="h-4 w-4">
        <AvatarFallback>
          {((user?.name?.charAt(0) || user?.email?.charAt(0) || '?')).toUpperCase()}
        </AvatarFallback>
        {user.avatar_url && <AvatarImage src={user.avatar_url} />}
      </Avatar>
      <span>{user?.name || user?.email?.split('@')?.[0] || 'User'}</span>
    </div>
  )
} 