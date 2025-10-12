import { createContext, useContext, useState } from 'react'

const MockAuthContext = createContext()

export function MockAuthProvider({ children }) {
  const [user, setUser] = useState({ id: 'mock_user_123', firstName: 'Demo' })
  const [isSignedIn, setIsSignedIn] = useState(true)

  return (
    <MockAuthContext.Provider value={{ user, isSignedIn, setUser, setIsSignedIn }}>
      {children}
    </MockAuthContext.Provider>
  )
}

export function useMockUser() {
  return useContext(MockAuthContext)
}

export function MockSignedIn({ children }) {
  const { isSignedIn } = useMockUser()
  return isSignedIn ? children : null
}

export function MockSignedOut({ children }) {
  const { isSignedIn } = useMockUser()
  return !isSignedIn ? children : null
}