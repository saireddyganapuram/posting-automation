import { useUser } from '@clerk/clerk-react'
import LinkedInEngagement from '../components/LinkedInEngagement'
import LinkedInCredentials from '../components/LinkedInCredentials'

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

      <div className="mb-6">
        <LinkedInCredentials />
      </div>

      <LinkedInEngagement />
    </div>
  )
}