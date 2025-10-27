import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import axios from 'axios'

export default function LinkedInEngagement() {
  const { user } = useUser()
  const [accounts, setAccounts] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [postUrl, setPostUrl] = useState('')
  const [comment, setComment] = useState('')
  const [commentary, setCommentary] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadAccounts()
    }
  }, [user])

  const loadAccounts = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/linkedin-accounts/${user.id}`)
      const accountsData = Array.isArray(response.data) ? response.data : []
      setAccounts(accountsData)
      if (accountsData.length > 0) {
        setSelectedAccountId(accountsData[0]._id)
        setHasSavedCredentials(!!accountsData[0].linkedinEmail)
        setEmail(accountsData[0].linkedinEmail || '')
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  const handleSaveCredentials = async () => {
    if (!email || !password) {
      setMessage('❌ Please enter email and password')
      return
    }
    if (!selectedAccountId) {
      setMessage('❌ Please connect a LinkedIn account first')
      return
    }

    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/linkedin-accounts/credentials/${selectedAccountId}`, {
        email,
        password
      })
      setMessage('✅ Credentials saved successfully')
      setPassword('')
      setIsEditing(false)
      setHasSavedCredentials(true)
      loadAccounts()
    } catch (error) {
      setMessage('❌ Error: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleDeleteCredentials = async () => {
    if (!confirm('Are you sure you want to delete saved credentials?')) return

    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/linkedin-accounts/credentials/${selectedAccountId}`)
      setMessage('✅ Credentials deleted successfully')
      setEmail('')
      setPassword('')
      setHasSavedCredentials(false)
      setIsEditing(false)
      loadAccounts()
    } catch (error) {
      setMessage('❌ Error: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleLike = async () => {
    if (!selectedAccountId || !postUrl) {
      setMessage('❌ Please select account and enter post URL')
      return
    }

    setLoading(true)
    setMessage('Liking post...')
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/engagement/like`, {
        accountId: selectedAccountId,
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
    if (!selectedAccountId || !postUrl || !comment) {
      setMessage('❌ Please fill in all required fields including comment')
      return
    }

    setLoading(true)
    setMessage('Posting comment...')
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/engagement/comment`, {
        accountId: selectedAccountId,
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
    if (!selectedAccountId || !postUrl) {
      setMessage('❌ Please select account and enter post URL')
      return
    }

    setLoading(true)
    setMessage('Sharing post...')
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/engagement/share`, {
        accountId: selectedAccountId,
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
        {/* Account Selection */}
        {accounts.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">Select LinkedIn Account</label>
            <select
              value={selectedAccountId || ''}
              onChange={(e) => {
                setSelectedAccountId(e.target.value)
                const account = accounts.find(acc => acc._id === e.target.value)
                setHasSavedCredentials(!!account?.linkedinEmail)
                setEmail(account?.linkedinEmail || '')
              }}
              className="w-full p-2 border rounded"
            >
              {accounts.map(account => (
                <option key={account._id} value={account._id}>
                  {account.linkedinName || account.linkedinEmail || 'LinkedIn Account'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Credentials Section */}
        <div className="border rounded p-4 bg-gray-50">
          <h3 className="font-medium mb-3">Automation Credentials</h3>
          
          {hasSavedCredentials && !isEditing ? (
            <div>
              <div className="p-3 bg-green-50 border border-green-200 rounded mb-3">
                <p className="text-green-800 font-medium">✅ Credentials saved</p>
                <p className="text-green-700 text-sm mt-1">Email: {email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '***'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Edit Credentials
                </button>
                <button
                  onClick={handleDeleteCredentials}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Delete Credentials
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div>
                <label className="block text-sm font-medium mb-1">LinkedIn Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">LinkedIn Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSaveCredentials}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Save Credentials
                </button>
                {isEditing && (
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setPassword('')
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Engagement Actions */}
        <div>

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
