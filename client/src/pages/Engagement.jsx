import { useUser } from '@clerk/clerk-react'
import { useState } from 'react'
import axios from 'axios'
import LinkedInEngagement from '../components/LinkedInEngagement'

export default function Engagement() {
  const { user } = useUser()
  const [searchTopic, setSearchTopic] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedPosts, setSelectedPosts] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isEngaging, setIsEngaging] = useState(false)
  const [message, setMessage] = useState('')
  const [enableLike, setEnableLike] = useState(true)
  const [enableComment, setEnableComment] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [activeAccountId, setActiveAccountId] = useState(null) // <-- NEW

  const handleSearchPosts = async () => {
    if (!searchTopic.trim() || !user?.id) {
      setMessage('Please enter a topic and ensure you are logged in')
      return
    }
    
    setIsSearching(true)
    setMessage('')
    
    try {
      // 1) Pre-check: ensure user has an active LinkedIn account with credentials
      const accountsRes = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/linkedin-accounts/${user.id}`,
        { headers: { 'Content-Type': 'application/json' } }
      )
      // support response shapes: [] or { accounts: [...] }
      let accounts = []
      if (Array.isArray(accountsRes.data)) {
        accounts = accountsRes.data
      } else if (Array.isArray(accountsRes.data?.accounts)) {
        accounts = accountsRes.data.accounts
      } else if (Array.isArray(accountsRes.data?.data)) {
        accounts = accountsRes.data.data
      }

      // prefer an explicit active account, otherwise fall back to the first account
      const active = accounts.find(a => a.isActive) || accounts[0]
      if (!active) {
        setMessage('No connected LinkedIn account found. Please connect an account in the Engagement Hub.')
        setIsSearching(false)
        return
      }
      // Save resolved LinkedIn account id for subsequent requests
      const resolvedAccountId = active._id || active.id || active.id_str || null
      setActiveAccountId(resolvedAccountId)
      // Do not check password client-side — server will validate/decrypt credentials securely
      console.log('Using LinkedIn account for search:', active)
 
      // 2) Perform search
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/engagement/search-posts`,
        {
          // pass the resolved LinkedIn account id if available, otherwise fall back to clerk id
          accountId: resolvedAccountId || user.id,
           topic: searchTopic.trim()
         },
         { headers: { 'Content-Type': 'application/json' } }
       )
       
      console.log('Search response:', response.data)
       console.log('Posts array:', response.data.posts)
       console.log('Posts length:', response.data.posts?.length)
       
       const posts = response.data.posts || []
       setSearchResults(posts)
       setSelectedPosts([])
       
       if (posts.length === 0) {
         setMessage('No posts found. Try a different topic or check your LinkedIn credentials.')
       } else {
         setMessage(`Found ${posts.length} posts!`)
       }
     } catch (error) {
       console.error('Search error:', error)
       const serverMsg = error.response?.data?.error
       if (error.response?.status === 404) {
         setMessage('LinkedIn account not found. Please connect your account first.')
       } else {
         setMessage(serverMsg ? `Error: ${serverMsg}` : 'Error searching posts: ' + error.message)
       }
     } finally {
       setIsSearching(false)
     }
   }
   
  const handleEngageSelected = async () => {
    if (selectedPosts.length === 0) return;
    
    if (!enableLike && !enableComment) {
      setMessage('Please select at least one action (Like or Comment)')
      return;
    }
    
    if (enableComment && !commentText.trim()) {
      setMessage('Please enter a comment text')
      return;
    }
    
    setIsEngaging(true);
    setMessage('')
    
    try {
      // Resolve active LinkedIn account and use its _id for backend
      const accountsRes = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/linkedin-accounts/${user.id}`,
        { headers: { 'Content-Type': 'application/json' } }
      )
      const accounts = Array.isArray(accountsRes.data) ? accountsRes.data : []
      const active = accounts.find(a => a.isActive) || accounts[0]
      if (!active) {
        setMessage('No active LinkedIn account found. Please add credentials in the Engagement Hub above.')
        return
      }
      if (!active.linkedinEmail || !active.linkedinPassword) {
        setMessage('LinkedIn email/password not set. Please save your credentials in the Engagement Hub above.')
        return
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/engagement/engage-multiple`,
        {
          accountId: active._id || user.id,
          posts: selectedPosts,
          actions: { 
            like: enableLike, 
            comment: enableComment
          },
          commentText: enableComment ? commentText : undefined
        },
        { headers: { 'Content-Type': 'application/json' } }
      )
      
      setMessage(`Success! ${response.data.message}`)
      setSelectedPosts([])
      
      // Show detailed results
      console.log('Engagement results:', response.data.results)
    } catch (error) {
      const serverMsg = error.response?.data?.error
      setMessage(serverMsg ? `Error: ${serverMsg}` : 'Error engaging with posts: ' + error.message)
    } finally {
      setIsEngaging(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">LinkedIn Engagement Helper</h1>
        <p className="text-gray-600">
          Tools to help you engage authentically with your LinkedIn network
        </p>
      </div>

      {/* Existing LinkedIn Engagement component */}
      <LinkedInEngagement />

      {/* Search & Engage Section */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Search & Engage with Posts</h2>
        <p className="text-sm text-gray-600 mb-6">
          Search LinkedIn for posts by topic and engage with them automatically. 
          <span className="font-medium text-blue-600"> Make sure you've added LinkedIn credentials above first!</span>
        </p>
        
        <div className="space-y-6">
          {/* Search Input */}
          <div className="flex gap-3">
            <input
              type="text"
              value={searchTopic}
              onChange={(e) => setSearchTopic(e.target.value)}
              placeholder="Enter topic (e.g., interview tips, HR rounds)"
              className="flex-1 p-2 border rounded-lg"
              disabled={isSearching}
            />
            <button
              onClick={handleSearchPosts}
              disabled={isSearching || !searchTopic.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search Posts'}
            </button>
          </div>

          {/* Engagement Options */}
          {searchResults.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Engagement Options</h3>
              
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableLike}
                    onChange={(e) => setEnableLike(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">👍 Like posts</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableComment}
                    onChange={(e) => setEnableComment(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">💬 Comment on posts</span>
                </label>
              </div>
              
              {enableComment && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comment Text (will be posted on all selected posts)
                  </label>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="e.g., Great insights! Thanks for sharing."
                    className="w-full p-2 border rounded-lg resize-none h-20"
                    disabled={isEngaging}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Tip: Use a genuine, thoughtful comment that adds value
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {searchResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Found {searchResults.length} posts</h3>
                <button
                  onClick={handleEngageSelected}
                  disabled={isEngaging || selectedPosts.length === 0}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {isEngaging ? 'Engaging...' : `Engage with ${selectedPosts.length} Posts`}
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {searchResults.map((post, index) => (
                  <div key={post.id || `post-${index}`} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedPosts.some(p => p.url === post.url)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPosts([...selectedPosts, post])
                        } else {
                          setSelectedPosts(selectedPosts.filter(p => p.url !== post.url))
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{post.author || 'Unknown Author'}</p>
                          <p className="text-sm text-gray-500">{post.timestamp || 'Recently'}</p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {post.engagement?.reactions && (
                            <span className="mr-3">👍 {post.engagement.reactions}</span>
                          )}
                          {post.engagement?.comments && (
                            <span>💬 {post.engagement.comments}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-800 mb-2 whitespace-pre-wrap">{post.text || 'No text available'}</p>
                      <div className="flex gap-3 items-center">
                        {post.url && (
                          <a 
                            href={post.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            View Post 
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                        {post.text && post.text !== 'No text available' && (
                          <span className="text-xs text-gray-400">
                            ({post.text.length} chars)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div className={`p-3 rounded ${
              message.startsWith('Success') || message.startsWith('Found') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {/* Usage Tips */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border text-sm">
            <h4 className="font-medium mb-2">💡 Tips for Effective Engagement:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Search for relevant LinkedIn posts by topic</li>
              <li>Select posts you want to engage with</li>
              <li>Choose to Like, Comment, or both</li>
              <li>Use genuine, thoughtful comments that add value</li>
              <li>Avoid generic comments like "Nice post" or "Great!"</li>
              <li>Limit engagement to 20-30 posts per day to avoid rate limiting</li>
              <li>Space out your engagement throughout the day</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
