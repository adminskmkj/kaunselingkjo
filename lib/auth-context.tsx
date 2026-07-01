// Auth context provider
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type DemoRole = Profile['role']

type AuthContextType = {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (identifier: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  demoSignIn: (role: DemoRole) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const demoProfiles: Record<DemoRole, Profile> = {
  student: {
    id: 'demo-student-001',
    role: 'student',
    full_name: 'Aiman Hakimi',
    class_name: '4 STEM 1',
    ic_or_student_id: '010345',
    avatar_url: null,
    parent_id: null,
    must_change_password: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  counselor: {
    id: 'demo-gbk-001',
    role: 'counselor',
    full_name: 'Cikgu Kaunseling KJo',
    class_name: null,
    ic_or_student_id: null,
    avatar_url: null,
    parent_id: null,
    must_change_password: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  class_teacher: {
    id: 'demo-guru-001',
    role: 'class_teacher',
    full_name: 'Cikgu Kelas 4 STEM 1',
    class_name: '4 STEM 1',
    ic_or_student_id: null,
    avatar_url: null,
    parent_id: null,
    must_change_password: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  discipline_teacher: {
    id: 'demo-disiplin-001',
    role: 'discipline_teacher',
    full_name: 'Cikgu Disiplin KJo',
    class_name: null,
    ic_or_student_id: null,
    avatar_url: null,
    parent_id: null,
    must_change_password: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  parent: {
    id: 'demo-parent-001',
    role: 'parent',
    full_name: 'Pn. Sarah Abdullah',
    class_name: null,
    ic_or_student_id: null,
    avatar_url: null,
    parent_id: null,
    must_change_password: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  admin: {
    id: 'demo-admin-001',
    role: 'admin',
    full_name: 'Pentadbir STAR KJo',
    class_name: null,
    ic_or_student_id: null,
    avatar_url: null,
    parent_id: null,
    must_change_password: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const demoRole = typeof window !== 'undefined' ? localStorage.getItem('star-kjo-demo-role') as DemoRole | null : null
    if (demoRole && demoProfiles[demoRole]) {
      setProfile(demoProfiles[demoRole])
      setLoading(false)
      return
    }

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
        const storedDemoRole = localStorage.getItem('star-kjo-demo-role') as DemoRole | null
        setProfile(storedDemoRole && demoProfiles[storedDemoRole] ? demoProfiles[storedDemoRole] : null)
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
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (identifier: string, password: string) => {
    const isIC = /^\d{12}$/.test(identifier)
    
    if (isIC) {
      const email = `${identifier}@student.skmkj.edu.my`
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: identifier, password })
      if (error) throw error
    }
  }

  const demoSignIn = (role: DemoRole) => {
    localStorage.setItem('star-kjo-demo-role', role)
    setUser(null)
    setProfile(demoProfiles[role])
  }

  const signOut = async () => {
    localStorage.removeItem('star-kjo-demo-role')
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
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile, demoSignIn }}>
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
