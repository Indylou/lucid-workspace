import React, { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar"
import { supabase } from '../../../lib/supabase'

interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
}

interface UserAssignmentProps {
  userId: string
}

export function UserAssignment({ userId }: UserAssignmentProps) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, name, avatar_url')
          .eq('id', userId)
          .single()

        if (error) throw error
        setUser(data)
      } catch (error) {
        console.error('Error fetching user:', error)
      }
    }

    if (userId) {
      fetchUser()
    }
  }, [userId])

  if (!user) return null

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
      <Avatar className="h-4 w-4">
        <AvatarFallback>
          {(user.name?.charAt(0) || user.email.charAt(0)).toUpperCase()}
        </AvatarFallback>
        {user.avatar_url && <AvatarImage src={user.avatar_url} />}
      </Avatar>
      <span>{user.name || user.email.split('@')[0]}</span>
    </div>
  )
} 