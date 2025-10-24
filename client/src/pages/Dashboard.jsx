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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Welcome, {user?.firstName}!</h1>
      
      {/* LinkedIn Accounts Management */}
      <div className="mb-8">
        <LinkedInAccounts 
          onAccountSelect={setSelectedAccountId}
          selectedAccountId={selectedAccountId}
          onAccountCountChange={setAccountCount}
          onAccountsChange={setAccounts}
        />
      </div>

      {/* AI Post Generator */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">AI Post Generator</h2>
        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to post about..."
            className="w-full p-3 border rounded-lg resize-none h-24"
          />
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeImage}
                onChange={(e) => setIncludeImage(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Include image description</span>
            </label>
          </div>
          
          <button
            onClick={handleGeneratePost}
            disabled={isGenerating || !prompt.trim()}
            className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : includeImage ? 'Generate Post + Image' : 'Generate Post'}
          </button>
          
          {generatedPost && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Generated Post:</h3>
              <p className="text-gray-800 mb-3">{generatedPost}</p>
              <p className="text-sm text-gray-600 mb-3">{generatedPost.length}/3000 characters</p>
              
              {imageUrl && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2 text-blue-800">Generated Image:</h4>
                  <img 
                    src={`http://localhost:5000${imageUrl}`} 
                    alt="Generated post image" 
                    className="w-full max-w-md rounded-lg shadow-md"
                  />
                </div>
              )}
              
              <div className="space-y-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Schedule for:</label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                {/* Account Selection */}
                {accounts.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Select Accounts to Post:</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedAccountIds.length === accounts.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAccountIds(accounts.map(acc => acc._id))
                            } else {
                              setSelectedAccountIds([])
                            }
                          }}
                          className="rounded"
                        />
                        <span className="font-medium text-blue-600">Select All ({accounts.length} accounts)</span>
                      </label>
                      <hr className="my-2" />
                      {accounts.map(account => (
                        <label key={account._id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedAccountIds.includes(account._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAccountIds([...selectedAccountIds, account._id])
                              } else {
                                setSelectedAccountIds(selectedAccountIds.filter(id => id !== account._id))
                              }
                            }}
                            className="rounded"
                          />
                          <span>{account.linkedinName || account.linkedinEmail}</span>
                          {account.isDefault && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Default</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                <button 
                  onClick={handleScheduleToSelectedAccounts}
                  disabled={!scheduledTime || selectedAccountIds.length === 0}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 w-full"
                >
                  Schedule to {selectedAccountIds.length} Selected Account{selectedAccountIds.length !== 1 ? 's' : ''}
                </button>
              </div>
              
              {selectedAccountIds.length === 0 && (
                <p className="text-amber-600 text-sm mt-2">💡 Select one or more accounts to schedule your post</p>
              )}
            </div>
          )}
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