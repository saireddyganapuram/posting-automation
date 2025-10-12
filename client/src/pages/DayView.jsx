import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { postsAPI } from '../services/api'
import SuccessPopup from '../components/SuccessPopup'

export default function DayView() {
  const { date } = useParams()
  const navigate = useNavigate()
  const { user } = useUser()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPost, setEditingPost] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editHasImage, setEditHasImage] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (user?.id && date) {
      loadDayPosts()
    }
  }, [user, date])

  const loadDayPosts = async () => {
    try {
      const response = await postsAPI.getScheduled(user.id)
      const selectedDate = new Date(date)
      const dayPosts = response.data.filter(post => {
        const postDate = new Date(post.scheduledTime)
        return postDate.toDateString() === selectedDate.toDateString()
      })
      setPosts(dayPosts.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime)))
    } catch (error) {
      console.error('Error loading day posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (post) => {
    setEditingPost(post._id)
    setEditContent(post.content)
    setEditTime(new Date(post.scheduledTime).toISOString().slice(0, 16))
    setEditImageUrl(post.imageUrl || '')
    setEditHasImage(post.hasImage || false)
  }

  const handleImageUpload = async (file) => {
    if (!file) return
    
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      
      const response = await fetch('http://localhost:5000/api/posts/upload-image', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      if (data.imageUrl) {
        setEditImageUrl(data.imageUrl)
        setEditHasImage(true)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = () => {
    setEditImageUrl('')
    setEditHasImage(false)
  }

  const handleSaveEdit = async (postId) => {
    try {
      await postsAPI.update(postId, editContent, editTime, editImageUrl, editHasImage)
      setEditingPost(null)
      setEditContent('')
      setEditTime('')
      setEditImageUrl('')
      setEditHasImage(false)
      setSuccessMessage('Post updated successfully!')
      setShowSuccess(true)
      loadDayPosts()
    } catch (error) {
      console.error('Error updating post:', error)
    }
  }

  const handleDelete = async (postId) => {
    if (confirm('Are you sure you want to delete this post?')) {
      try {
        await postsAPI.delete(postId)
        setSuccessMessage('Post deleted successfully!')
        setShowSuccess(true)
        loadDayPosts()
      } catch (error) {
        console.error('Error deleting post:', error)
      }
    }
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const canEdit = (scheduledTime) => {
    return new Date(scheduledTime) > new Date()
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button 
            onClick={() => navigate('/calendar')}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Back to Calendar
          </button>
          <h1 className="text-2xl font-bold">Posts for {formatDate(date)}</h1>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No posts scheduled for this day.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
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
                    post.status === 'scheduled' 
                      ? 'bg-yellow-100 text-yellow-800'
                      : post.status === 'posted'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {post.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {formatTime(post.scheduledTime)}
                </div>
              </div>

              {editingPost === post._id ? (
                <div className="space-y-4">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-3 border rounded-lg resize-none h-24"
                    maxLength={3000}
                  />
                  <div className="text-sm text-gray-500">
                    {editContent.length}/3000 characters
                  </div>
                  
                  {/* Image editing section */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Image</h4>
                    
                    {editHasImage && editImageUrl ? (
                      <div className="space-y-3">
                        <img 
                          src={editImageUrl.startsWith('http') ? editImageUrl : `http://localhost:5000${editImageUrl}`}
                          alt="Post image" 
                          className="w-full max-w-md rounded-lg"
                        />
                        <div className="flex space-x-2">
                          <label className="bg-blue-600 text-white px-3 py-1 rounded text-sm cursor-pointer hover:bg-blue-700">
                            Replace Image
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e.target.files[0])}
                              className="hidden"
                              disabled={uploadingImage}
                            />
                          </label>
                          <button
                            onClick={handleRemoveImage}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                          >
                            Remove Image
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="bg-blue-600 text-white px-3 py-2 rounded cursor-pointer hover:bg-blue-700 inline-block">
                          {uploadingImage ? 'Uploading...' : 'Upload Image'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e.target.files[0])}
                            className="hidden"
                            disabled={uploadingImage}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="datetime-local"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="p-2 border rounded"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSaveEdit(post._id)}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingPost(null)}
                      className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-800 mb-4">{post.content}</p>
                  
                  {post.hasImage && post.imageUrl && (
                    <div className="mb-4">
                      <img 
                        src={`http://localhost:5000${post.imageUrl}`} 
                        alt="Post image" 
                        className="w-full max-w-md rounded-lg"
                      />
                    </div>
                  )}

                  {canEdit(post.scheduledTime) && post.status === 'scheduled' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(post)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(post._id)}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  )}

                  {!canEdit(post.scheduledTime) && (
                    <p className="text-sm text-gray-500 italic">
                      Cannot edit - scheduled time has passed
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <SuccessPopup 
        show={showSuccess}
        message={successMessage}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  )
}