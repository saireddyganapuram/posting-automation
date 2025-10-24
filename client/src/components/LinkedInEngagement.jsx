import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { linkedinAccountsAPI } from '../services/api'
import axios from 'axios'

export default function LinkedInEngagement() {
  const { user } = useUser()
  const [accounts, setAccounts] = useState([])
  const [postUrl, setPostUrl] = useState('')
  const [comment, setComment] = useState('')
  const [commentary, setCommentary] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user?.id) {
      loadAccounts()
    }
  }, [user])

  const loadAccounts = async () => {
    try {
      const response = await linkedinAccountsAPI.getAccounts(user.id)
      const accountsData = Array.isArray(response.data) ? response.data : []
      setAccounts(accountsData)
    } catch (error) {
      console.error('Error loading accounts:', error)
      setAccounts([])
    }
  }

  const handleLike = async () => {
    if (accounts.length === 0) {
      setMessage('Please connect a LinkedIn account first')
      return
    }
    if (!postUrl) {
      setMessage('Please enter post URL')
      return
    }

    setLoading(true)
    setMessage('Liking post...')
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/engagement/like`, {
        accountId: accounts[0]._id,
        postUrl,
        userId: user?.id
      })
      setMessage('✅ ' + response.data.message)
    } catch (error) {
      setMessage('❌ Error: ' + (error.response?.data?.error || error.message))
    }
    
    setLoading(false)
  }

  const handleComment = async () => {
    if (accounts.length === 0) {
      setMessage('Please connect a LinkedIn account first')
      return
    }
    if (!postUrl || !comment) {
      setMessage('Please enter post URL and comment')
      return
    }

    setLoading(true)
    setMessage('Posting comment...')
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/engagement/comment`, {
        accountId: accounts[0]._id,
        postUrl,
        comment,
        userId: user?.id
      })
      setMessage('✅ ' + response.data.message)
      setComment('')
    } catch (error) {
      setMessage('❌ Error: ' + (error.response?.data?.error || error.message))
    }
    
    setLoading(false)
  }

  const handleShare = async () => {
    if (accounts.length === 0) {
      setMessage('Please connect a LinkedIn account first')
      return
    }
    if (!postUrl) {
      setMessage('Please enter post URL')
      return
    }

    setLoading(true)
    setMessage('Sharing post...')
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/engagement/share`, {
        accountId: accounts[0]._id,
        postUrl,
        commentary,
        userId: user?.id
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
          {accounts.length === 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4">
              <p className="text-yellow-800 font-medium">⚠️ No LinkedIn accounts connected</p>
              <p className="text-yellow-700 text-sm mt-1">Please connect a LinkedIn account from the Dashboard first.</p>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
            </div>
          )}

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


      </div>
    </div>
  )
}
