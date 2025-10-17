import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import axios from 'axios'

export default function LinkedInInteractions({ accounts }) {
  const { user } = useUser()
  const [postUrn, setPostUrn] = useState('')
  const [comment, setComment] = useState('')
  const [commentary, setCommentary] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLike = async () => {
    if (!postUrn || !selectedAccount) return
    
    setLoading(true)
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/interactions/like/${user.id}`, {
        postUrn,
        accountId: selectedAccount
      })
      alert('Post liked successfully!')
    } catch (error) {
      alert('Failed to like post: ' + error.response?.data?.error)
    }
    setLoading(false)
  }

  const handleComment = async () => {
    if (!postUrn || !comment || !selectedAccount) return
    
    setLoading(true)
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/interactions/comment/${user.id}`, {
        postUrn,
        comment,
        accountId: selectedAccount
      })
      alert('Comment posted successfully!')
      setComment('')
    } catch (error) {
      alert('Failed to comment: ' + error.response?.data?.error)
    }
    setLoading(false)
  }

  const handleShare = async () => {
    if (!postUrn || !selectedAccount) return
    
    setLoading(true)
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/interactions/share/${user.id}`, {
        postUrn,
        commentary,
        accountId: selectedAccount
      })
      alert('Post shared successfully!')
      setCommentary('')
    } catch (error) {
      alert('Failed to share post: ' + error.response?.data?.error)
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">LinkedIn Post Interactions</h3>
      
      {accounts.length === 0 ? (
        <p className="text-gray-600">Connect a LinkedIn account to interact with posts</p>
      ) : (
        <div className="space-y-4">
          {/* Account Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Account</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Choose account...</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          {/* Post URN Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              LinkedIn Post URN
              <span className="text-xs text-gray-500 ml-2">
                (e.g., urn:li:activity:1234567890)
              </span>
            </label>
            <input
              type="text"
              value={postUrn}
              onChange={(e) => setPostUrn(e.target.value)}
              placeholder="urn:li:activity:1234567890"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* Like Button */}
          <button
            onClick={handleLike}
            disabled={loading || !postUrn || !selectedAccount}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            👍 Like Post
          </button>

          {/* Comment Section */}
          <div>
            <label className="block text-sm font-medium mb-2">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your comment..."
              className="w-full border rounded-lg px-3 py-2 h-20"
            />
            <button
              onClick={handleComment}
              disabled={loading || !postUrn || !comment || !selectedAccount}
              className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              💬 Comment
            </button>
          </div>

          {/* Share Section */}
          <div>
            <label className="block text-sm font-medium mb-2">Share with Commentary (Optional)</label>
            <textarea
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              placeholder="Add your thoughts when sharing..."
              className="w-full border rounded-lg px-3 py-2 h-20"
            />
            <button
              onClick={handleShare}
              disabled={loading || !postUrn || !selectedAccount}
              className="mt-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              🔄 Share Post
            </button>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
            <p className="text-yellow-800 font-medium">📝 How to get Post URN:</p>
            <div className="text-yellow-700 text-sm mt-1 space-y-1">
              <p>1. Go to the LinkedIn post you want to interact with</p>
              <p>2. Click the "..." menu on the post</p>
              <p>3. Select "Copy link to post"</p>
              <p>4. The URN is in the URL: activity:1234567890</p>
              <p>5. Format as: urn:li:activity:1234567890</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}