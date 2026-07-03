// Auth context provider
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

type AuthContextType = {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (identifier: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      if (!data) throw new Error('Profil tidak dijumpai')

      const profileData = data as unknown as Profile
      setProfile(profileData)
      if (profileData.must_change_password && window.location.pathname !== '/reset-password') {
        window.location.href = '/reset-password'
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (identifier: string, password: string) => {
    const isIC = /^\d{12}$/.test(identifier)

    const email = isIC ? `${identifier}@student.skmkj.edu.my` : identifier

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    if (data.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        await supabase.auth.signOut()
        if (profileError.message?.includes('infinite recursion')) {
          throw new Error(
            'Ralat pangkalan data (RLS). Pentadbir perlu run migration 004 di Supabase SQL Editor.'
          )
        }
        throw new Error(
          'Login berjaya tetapi profil tidak dijumpai. Hubungi pentadbir untuk daftar peranan (GBK/guru).'
        )
      }

      if (!profileData) {
        await supabase.auth.signOut()
        throw new Error('Akaun tiada profil. GBK/guru perlu didaftarkan oleh pentadbir.')
      }

      setUser(data.user)
      setProfile(profileData)
    }
  }

  const signOut = async () => {
    setProfile(null)
    setUser(null)
    await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
