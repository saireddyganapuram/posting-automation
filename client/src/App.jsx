import { Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Landing from './pages/Landing'
import DayView from './pages/DayView'
import PostHistory from './pages/PostHistory'
import Engagement from './pages/Engagement'

function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/calendar" element={
          <ProtectedRoute>
            <Calendar />
          </ProtectedRoute>
        } />
        <Route path="/day/:date" element={
          <ProtectedRoute>
            <DayView />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <PostHistory />
          </ProtectedRoute>
        } />
        <Route path="/engagement" element={
          <ProtectedRoute>
            <Engagement />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  )
}