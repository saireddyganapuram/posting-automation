import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-blue-600">
            LinkedIn Scheduler
          </Link>
          
          <nav className="flex items-center space-x-4">
            <SignedIn>
              <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">
                Dashboard
              </Link>
              <Link to="/calendar" className="text-gray-700 hover:text-blue-600">
                Calendar
              </Link>
              <Link to="/history" className="text-gray-700 hover:text-blue-600">
                Post History
              </Link>
              <UserButton />
            </SignedIn>
            
            <SignedOut>
              <SignInButton mode="modal">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </nav>
        </div>
      </div>
    </header>
  )
}