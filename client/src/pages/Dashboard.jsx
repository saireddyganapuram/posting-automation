import { useUser } from '@clerk/clerk-react'
import { useState, useEffect } from 'react'
import { linkedinAPI, chatbotAPI, postsAPI } from '../services/api'
import SuccessPopup from '../components/SuccessPopup'
import LinkedInAccounts from '../components/LinkedInAccounts'

export default function Dashboard() {
  const { user } = useUser()
  const [linkedinConnected, setLinkedinConnected] = useState(false)
  const [linkedinName, setLinkedinName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [generatedPost, setGeneratedPost] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [scheduledTime, setScheduledTime] = useState('')
  const [includeImage, setIncludeImage] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [accountCount, setAccountCount] = useState(0)
  const [selectedAccountIds, setSelectedAccountIds] = useState([])
  const [accounts, setAccounts] = useState([])

  useEffect(() => {
    if (user?.id) {
      checkLinkedinStatus()
    }
  }, [user])

  const checkLinkedinStatus = async () => {
    try {
      const response = await linkedinAPI.getStatus(user.id)
      setLinkedinConnected(response.data.connected)
      setLinkedinName(response.data.name || '')
    } catch (error) {
      console.error('Error checking LinkedIn status:', error)
    }
  }

  const handleConnectLinkedin = async () => {
    try {
      const response = await linkedinAPI.getAuthUrl(user.id)
      
      // Open popup window
      const popup = window.open(
        response.data.authUrl,
        'linkedin-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      )
      
      // Listen for messages from popup
      const messageListener = (event) => {
        if (event.data.type === 'linkedin-auth') {
          console.log('LinkedIn auth response:', event.data)
          if (event.data.status === 'connected') {
            setLinkedinConnected(true)
            setLinkedinName('LinkedIn User')
            setSuccessMessage('LinkedIn connected successfully!')
            setShowSuccess(true)
          } else if (event.data.status === 'denied') {
            setSuccessMessage(`LinkedIn connection denied: ${event.data.error || 'Unknown error'}`)
            setShowSuccess(true)
          } else {
            setSuccessMessage(`Failed to connect LinkedIn: ${event.data.error || 'Unknown error'}`)
            setShowSuccess(true)
          }
          window.removeEventListener('message', messageListener)
          popup.close()
        }
      }
      
      window.addEventListener('message', messageListener)
      
      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', messageListener)
        }
      }, 1000)
      
    } catch (error) {
      console.error('Error connecting LinkedIn:', error)
      setSuccessMessage('Failed to connect LinkedIn. Please try again.')
      setShowSuccess(true)
    }
  }

  const handleTestPost = async () => {
    try {
      const response = await linkedinAPI.testPost(user.id)
      setSuccessMessage('Test post created successfully!')
      setShowSuccess(true)
    } catch (error) {
      console.error('Error creating test post:', error)
      setSuccessMessage('Failed to create test post: ' + (error.response?.data?.details || error.message))
      setShowSuccess(true)
    }
  }

  const handleDisconnectLinkedin = async () => {
    if (!confirm('Are you sure you want to disconnect your LinkedIn account?')) {
      return
    }
    
    try {
      await linkedinAPI.disconnect(user.id)
      setLinkedinConnected(false)
      setLinkedinName('')
      setSuccessMessage('LinkedIn account disconnected successfully!')
      setShowSuccess(true)
    } catch (error) {
      console.error('Error disconnecting LinkedIn:', error)
      setSuccessMessage('Failed to disconnect LinkedIn account.')
      setShowSuccess(true)
    }
  }

  const handleGeneratePost = async () => {
    if (!prompt.trim()) return
    
    setIsGenerating(true)
    try {
      if (includeImage) {
        const response = await chatbotAPI.generateWithImage(prompt)
        setGeneratedPost(response.data.tweet)
        setImageUrl(response.data.imageUrl || '')
      } else {
        const response = await chatbotAPI.generateTweet(prompt)
        setGeneratedPost(response.data.tweet)
        setImageUrl('')
      }
    } catch (error) {
      console.error('Error generating post:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSchedulePost = async () => {
    if (!generatedPost || !scheduledTime || !selectedAccountId) return
    
    try {
      await postsAPI.schedule(user.id, generatedPost, scheduledTime, imageUrl, !!imageUrl, 'static', {}, selectedAccountId)
      setSuccessMessage('Post scheduled successfully!')
      setShowSuccess(true)
      setGeneratedPost('')
      setImageUrl('')
      setScheduledTime('')
      setPrompt('')
    } catch (error) {
      console.error('Error scheduling post:', error)
      setSuccessMessage('Failed to schedule post')
      setShowSuccess(true)
    }
  }

  const handleScheduleToSelectedAccounts = async () => {
    if (!generatedPost || !scheduledTime || selectedAccountIds.length === 0) return
    
    try {
      if (selectedAccountIds.length === 1) {
        // Single account
        await postsAPI.schedule(user.id, generatedPost, scheduledTime, imageUrl, !!imageUrl, 'static', {}, selectedAccountIds[0])
        setSuccessMessage('Post scheduled successfully!')
      } else {
        // Multiple accounts - use schedule-all with selected accounts
        const response = await postsAPI.scheduleToAll(user.id, generatedPost, scheduledTime, imageUrl, !!imageUrl, 'static', {})
        setSuccessMessage(`Post scheduled to ${selectedAccountIds.length} LinkedIn accounts!`)
      }
      
      setShowSuccess(true)
      setGeneratedPost('')
      setImageUrl('')
      setScheduledTime('')
      setPrompt('')
      setSelectedAccountIds([])
    } catch (error) {
      console.error('Error scheduling to selected accounts:', error)
      setSuccessMessage('Failed to schedule post')
      setShowSuccess(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.firstName}</h1>
          <p className="text-gray-600 mt-1">Create and schedule your LinkedIn content</p>
        </div>

        {/* LinkedIn Accounts */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">LinkedIn Accounts</h2>
          <LinkedInAccounts 
            onAccountSelect={setSelectedAccountId}
            selectedAccountId={selectedAccountId}
            onAccountCountChange={setAccountCount}
            onAccountsChange={setAccounts}
          />
        </div>

        {/* AI Post Generator */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Generate Post with AI</h2>
              <div className="space-y-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to post about..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none h-28 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeImage}
                    onChange={(e) => setIncludeImage(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Include AI-generated image</span>
                </label>
                
                <button
                  onClick={handleGeneratePost}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Generating...' : includeImage ? 'Generate Post + Image' : 'Generate Post'}
                </button>
                
                {generatedPost && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Generated Post</h3>
                    
                    <div className="bg-white p-4 rounded border border-gray-200 mb-4">
                      <p className="text-gray-800 whitespace-pre-wrap">{generatedPost}</p>
                      <p className="text-sm text-gray-500 mt-3">{generatedPost.length}/3000 characters</p>
                    </div>
                    
                    {imageUrl && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-700 mb-2">Generated Image</h4>
                        <img 
                          src={`http://localhost:5000${imageUrl}`} 
                          alt="Generated post image" 
                          className="w-full rounded-lg"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Date & Time</label>
                        <input
                          type="datetime-local"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      
                      {accounts.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Select Accounts</label>
                          <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedAccountIds.length === accounts.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAccountIds(accounts.map(acc => acc.id))
                                  } else {
                                    setSelectedAccountIds([])
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-sm font-medium">Select All ({accounts.length})</span>
                            </label>
                            <hr />
                            {accounts.map(account => (
                              <label key={account.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedAccountIds.includes(account.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAccountIds([...selectedAccountIds, account.id])
                                    } else {
                                      setSelectedAccountIds(selectedAccountIds.filter(id => id !== account.id))
                                    }
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm">{account.name}</span>
                                {account.isDefault && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Default</span>}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <button 
                        onClick={handleScheduleToSelectedAccounts}
                        disabled={!scheduledTime || selectedAccountIds.length === 0}
                        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Schedule to {selectedAccountIds.length} Account{selectedAccountIds.length !== 1 ? 's' : ''}
                      </button>
                      
                      {selectedAccountIds.length === 0 && (
                        <p className="text-sm text-amber-600">Select one or more accounts to schedule</p>
                      )}
                    </div>
                  </div>
                )}
          </div>
        </div>
      </div>

      <SuccessPopup 
        show={showSuccess}
        message={successMessage}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  )
}