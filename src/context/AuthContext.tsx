import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface AuthUser {
  id: string
  email: string
  name?: string
  avatar?: string
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, pass: string) => Promise<void>
  loginAsDemo: () => Promise<void>
  register: (email: string, pass: string, name: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const syncAuth = (model: RecordModel | null) => {
    if (model) {
      setUser({
        id: model.id,
        email: model.email || '',
        name: model.name || 'Dr. Fábio Teixeira',
        avatar: model.avatar ? pb.files.getURL(model, model.avatar) : undefined,
      })
    } else {
      setUser(null)
    }
  }

  useEffect(() => {
    // Carrega o usuário atual se o token for válido
    if (pb.authStore.isValid && pb.authStore.record) {
      syncAuth(pb.authStore.record)
    } else {
      // Se não houver autenticação ativa, tenta login padrão silencioso de conveniência
      autoLoginDefaultUser()
    }
    setIsLoading(false)

    const unsubscribe = pb.authStore.onChange((_token, model) => {
      syncAuth(model)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const autoLoginDefaultUser = async () => {
    try {
      if (!pb.authStore.isValid) {
        await pb.collection('users').authWithPassword('fabio.saantost@gmail.com', 'Skip@Pass')
      }
    } catch (_) {
      // Falha silenciosa no login automático se as credenciais mudarem
    }
  }

  const login = async (email: string, pass: string) => {
    setIsLoading(true)
    try {
      await pb.collection('users').authWithPassword(email, pass)
    } finally {
      setIsLoading(false)
    }
  }

  const loginAsDemo = async () => {
    setIsLoading(true)
    try {
      await pb.collection('users').authWithPassword('fabio.saantost@gmail.com', 'Skip@Pass')
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, pass: string, name: string) => {
    setIsLoading(true)
    try {
      await pb.collection('users').create({
        email,
        password: pass,
        passwordConfirm: pass,
        name,
      })
      await pb.collection('users').authWithPassword(email, pass)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginAsDemo,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
