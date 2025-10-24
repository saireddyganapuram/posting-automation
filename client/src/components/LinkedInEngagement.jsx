import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import axios from 'axios'

export default function LinkedInEngagement() {
  const { user } = useUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [postUrl, setPostUrl] = useState('')
  const [comment, setComment] = useState('')
  const [commentary, setCommentary] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLike = async () => {
    if (!email || !password || !postUrl) {
      setMessage('Please fill in all required fields')
      return
    }

    setLoading(true)
    setMessage('Liking post...')
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/engagement/like`, {
        email,
        password,
        postUrl
      })
      setMessage('✅ ' + response.data.message)
    } catch (error) {
      setMessage('❌ Error: ' + (error.response?.data?.error || error.message))
    }
    
    setLoading(false)
  }

  const handleComment = async () => {
    if (!email || !password || !postUrl || !comment) {
      setMessage('Please fill in all required fields including comment')
      return
    }

    setLoading(true)
    setMessage('Posting comment...')
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/engagement/comment`, {
        email,
        password,
        postUrl,
        comment
      })
      setMessage('✅ ' + response.data.message)
      setComment('')
    } catch (error) {
      setMessage('❌ Error: ' + (error.response?.data?.error || error.message))
    }
    
    setLoading(false)
  }

  const handleShare = async () => {
    if (!email || !password || !postUrl) {
      setMessage('Please fill in all required fields')
      return
    }

    setLoading(true)
    setMessage('Sharing post...')
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/engagement/share`, {
        email,
        password,
        postUrl,
        commentary
      })
      setMessage('✅ ' + response.data.message)
      setCommentary('')
    } catch (error) {
      setMessage('❌ Error: ' + (error.response?.data?.error || error.message))
    }
    
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">🤖 LinkedIn Engagement Automation</h2>
      
      {/* Warning */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Use at your own risk:</strong> This feature uses browser automation which may violate LinkedIn's Terms of Service. Use responsibly for testing purposes only.
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <div>
            <label className="block text-sm font-medium mb-1">LinkedIn Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="w-full p-2 border rounded"
              disabled={loading}
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">LinkedIn Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full p-2 border rounded"
              disabled={loading}
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Post URL</label>
            <input
              type="text"
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://www.linkedin.com/posts/..."
              className="w-full p-2 border rounded"
              disabled={loading}
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleLike}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              👍 Like Post
            </button>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your comment..."
              className="w-full p-2 border rounded h-20"
              disabled={loading}
            />
            <button
              onClick={handleComment}
              disabled={loading}
              className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              💬 Post Comment
            </button>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Share Commentary (optional)</label>
            <textarea
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              placeholder="Add your thoughts when sharing..."
              className="w-full p-2 border rounded h-20"
              disabled={loading}
            />
            <button
              onClick={handleShare}
              disabled={loading}
              className="mt-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              🔄 Share Post
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        <div className="mt-4 p-3 bg-gray-50 rounded border">
          <p className="text-gray-700 font-medium">ℹ️ Technical Notes:</p>
          <ul className="text-gray-600 text-sm mt-1 space-y-1 list-disc list-inside">
            <li>Browser automation using Puppeteer</li>
            <li>A browser window will open during the process</li>
            <li>Process may take 10-30 seconds</li>
            <li>LinkedIn may show security challenges</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
