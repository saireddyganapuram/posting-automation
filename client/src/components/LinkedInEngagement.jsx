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
      
      <div className="space-y-4">
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

        <div>
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

        <div>
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

        <div className="flex gap-2">
          <button
            onClick={handleLike}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            👍 Like Post
          </button>
        </div>

        <div>
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

        <div>
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

        {message && (
          <div className={`p-3 rounded ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
          <p className="text-yellow-800 font-medium">⚠️ Important Notes:</p>
          <ul className="text-yellow-700 text-sm mt-1 space-y-1 list-disc list-inside">
            <li>This uses browser automation (Puppeteer)</li>
            <li>A browser window will open during the process</li>
            <li>Your credentials are used only for this session</li>
            <li>Excessive automation may trigger LinkedIn security</li>
            <li>Use responsibly and within LinkedIn's terms</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
