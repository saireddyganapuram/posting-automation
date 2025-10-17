import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { postsAPI } from '../services/api'

export default function PostHistory() {
  const { user } = useUser()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, posted, failed

  useEffect(() => {
    if (user?.id) {
      loadPostedPosts()
    }
  }, [user])

  const loadPostedPosts = async () => {
    try {
      const response = await postsAPI.getScheduled(user.id)
      // Filter only posted and failed posts
      const postedPosts = response.data.filter(post => 
        post.status === 'posted' || post.status === 'failed'
      )
      setPosts(postedPosts.sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime)))
    } catch (error) {
      console.error('Error loading posted posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true
    return post.status === filter
  })

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">Loading post history...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Post History</h1>
        
        {/* Filter buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded text-sm ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All ({posts.length})
          </button>
          <button
            onClick={() => setFilter('posted')}
            className={`px-4 py-2 rounded text-sm ${
              filter === 'posted' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Posted ({posts.filter(p => p.status === 'posted').length})
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`px-4 py-2 rounded text-sm ${
              filter === 'failed' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Failed ({posts.filter(p => p.status === 'failed').length})
          </button>
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'No post history found.' 
              : `No ${filter} posts found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div key={post._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    post.postType === 'dynamic' 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {post.postType || 'static'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    post.status === 'posted'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {post.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(post.scheduledTime)}
                </div>
              </div>

              <p className="text-gray-800 mb-4">{post.content}</p>
              
              {post.hasImage && post.imageUrl && (
                <div className="mb-4">
                  <img 
                    src={post.imageUrl.startsWith('http') ? post.imageUrl : `http://localhost:5000${post.imageUrl}`}
                    alt="Post image" 
                    className="w-full max-w-md rounded-lg"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+PC9zdmc+'
                      e.target.className = 'w-full max-w-md rounded-lg border-2 border-dashed border-gray-300'
                    }}
                  />
                </div>
              )}

              {post.status === 'failed' && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-red-800 text-sm">
                    <strong>Failed to post:</strong> This post could not be published to LinkedIn. 
                    You can reschedule it from the dashboard.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}