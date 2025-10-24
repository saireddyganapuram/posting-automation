import { useUser } from '@clerk/clerk-react'
import LinkedInEngagement from '../components/LinkedInEngagement'

export default function Engagement() {
  const { user } = useUser()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">LinkedIn Engagement Helper</h1>
        <p className="text-gray-600">
          Tools to help you engage authentically with your LinkedIn network
        </p>
      </div>

      {/* Important Notice */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Manual Engagement Only:</strong> This tool provides templates and suggestions. 
              All engagement must be done manually on LinkedIn to comply with their Terms of Service.
            </p>
          </div>
        </div>
      </div>

      {/* LinkedIn Engagement Automation */}
      <LinkedInEngagement />

      {/* Disclaimer */}
      <div className="mt-8 p-4 bg-gray-50 rounded border">
        <p className="text-sm text-gray-600 text-center">
          <strong>Note:</strong> This tool provides templates and suggestions only. 
          All engagement actions must be performed manually on LinkedIn. 
          Automated engagement violates LinkedIn's Terms of Service.
        </p>
      </div>
    </div>
  )
}