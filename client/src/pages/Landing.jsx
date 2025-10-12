import { SignedIn, SignedOut, SignUpButton } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'

export default function Landing() {
  return (
    <>
      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>
      
      <SignedOut>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Schedule Your LinkedIn Content with AI
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Generate LinkedIn posts with AI, schedule them on a calendar, and auto-publish to LinkedIn
          </p>
          
          <div className="space-y-4">
            <SignUpButton mode="modal">
              <button className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-700">
                Get Started Free
              </button>
            </SignUpButton>
          </div>
          
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">AI Content Generation</h3>
              <p className="text-gray-600">Generate engaging LinkedIn posts using Google Gemini AI</p>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">Smart Scheduling</h3>
              <p className="text-gray-600">Schedule posts on an intuitive calendar interface</p>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">Auto Publishing</h3>
              <p className="text-gray-600">Automatically publish posts to LinkedIn at scheduled times</p>
            </div>
          </div>
        </div>
      </SignedOut>
    </>
  )
}