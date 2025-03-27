import React, { useState, useEffect, useRef } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { Button } from "../../../components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar"
import { Check, UserIcon, X } from 'lucide-react'
import { supabase, adminSupabase } from '../../../lib/supabase'
import { useUser } from '../../../lib/user-context'

interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  user_metadata?: {
    avatar_url?: string
  }
}

interface UserSelectorProps {
  onSelect: (userId: string) => void
  currentUserId?: string | null
}

// Cache to store all users to reduce repeated requests
let usersCache: User[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute

export function UserSelector({ onSelect, currentUserId }: UserSelectorProps) {
  const [users, setUsers] = useState<User[]>([])
  const { user: currentUser } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const fetchingRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return;
    
    // If we have cached users and the cache is still fresh, use it
    const now = Date.now();
    if (usersCache.length > 0 && now - lastFetchTime < CACHE_DURATION) {
      setUsers(usersCache);
      return;
    }
    
    // Prevent multiple fetches happening at once
    if (fetchingRef.current) return;
    
    const fetchUsers = async () => {
      try {
        fetchingRef.current = true;
        
        // Use the users view instead of profiles
        const { data, error } = await adminSupabase
          .from('users')  // Changed from 'profiles' to 'users'
          .select('id, email, name, avatar_url')
          .order('name')

        if (error) throw error;
        
        // Update the cache
        if (data) {
          usersCache = data;
          lastFetchTime = Date.now();
        }
        
        setUsers(data || [])
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        fetchingRef.current = false;
      }
    }
    
    fetchUsers();
    
    return () => {
      // No cleanup needed
    }
  }, [isOpen])

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <UserIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
          Assign to user
        </div>
        
        {/* Current user */}
        {currentUser && (
          <DropdownMenuItem onClick={() => {
            onSelect(currentUser.id)
            setIsOpen(false)
          }}>
            <div className={`w-full flex items-center ${currentUserId === currentUser.id ? 'font-medium' : ''}`}>
              <Avatar className="h-5 w-5 mr-2">
                <AvatarFallback>
                  {currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
                {currentUser.avatar_url && (
                  <AvatarImage src={currentUser.avatar_url} />
                )}
              </Avatar>
              <span className="flex-1">Me</span>
              {currentUserId === currentUser.id && (
                <Check className="h-3.5 w-3.5 ml-2 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        )}
        
        {/* Other users */}
        {users
          .filter(user => user.id !== currentUser?.id)
          .map(user => (
            <DropdownMenuItem 
              key={user.id}
              onClick={() => {
                onSelect(user.id)
                setIsOpen(false)
              }}
            >
              <div className={`w-full flex items-center ${currentUserId === user.id ? 'font-medium' : ''}`}>
                <Avatar className="h-5 w-5 mr-2">
                  <AvatarFallback>
                    {((user?.name?.charAt(0) || user?.email?.charAt(0) || '?')).toUpperCase()}
                  </AvatarFallback>
                  {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                </Avatar>
                <span className="flex-1">{user?.name || user?.email?.split('@')?.[0] || 'User'}</span>
                {currentUserId === user.id && (
                  <Check className="h-3.5 w-3.5 ml-2 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        
        {currentUserId && (
          <DropdownMenuItem onClick={() => {
            onSelect('')
            setIsOpen(false)
          }}>
            <X className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <span>Unassign</span>
          </DropdownMenuItem>
        )}
        
        {users.length === 0 && !fetchingRef.current && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No users available
          </div>
        )}
        
        {fetchingRef.current && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Loading users...
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 