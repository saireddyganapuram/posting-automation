import { useUser } from '@clerk/clerk-react'
import { useState, useEffect, useCallback } from 'react'
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
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [accountCount, setAccountCount] = useState(0)
  const [selectedAccountIds, setSelectedAccountIds] = useState([])
  const [accounts, setAccounts] = useState([])

  const checkLinkedinStatus = useCallback(async () => {
    try {
      const response = await linkedinAPI.getStatus(user.id)
      setLinkedinConnected(response.data.connected)
      setLinkedinName(response.data.name || '')
    } catch (error) {
      console.error('Error checking LinkedIn status:', error)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      checkLinkedinStatus()
    }
  }, [user?.id, checkLinkedinStatus])

  const handleGeneratePost = async () => {
    if (!prompt.trim()) return
    
    setIsGenerating(true)
    try {
      const response = await chatbotAPI.generateWithImage(prompt)
      setGeneratedPost(response.data.tweet)
      setImageUrl(response.data.imageUrl || '')
    } catch (error) {
      console.error('Error generating post:', error)
    } finally {
      setIsGenerating(false)
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
        await postsAPI.scheduleToAll(user.id, generatedPost, scheduledTime, imageUrl, !!imageUrl, 'static', {})
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
      <div className="w-full px-8 py-10 max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.firstName}</h1>
            <p className="text-sm text-gray-600">Create, preview and schedule LinkedIn content quickly</p>
            <div className="mt-2 flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <span className={`w-2 h-2 rounded-full ${linkedinConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>{linkedinConnected ? (linkedinName || 'LinkedIn connected') : 'LinkedIn not connected'}</span>
              </div>
              <div className="text-gray-500">•</div>
              <div className="text-gray-600">{accountCount} account{accountCount !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>

        {/* LinkedIn Accounts */}
        <div className="bg-white rounded-lg shadow p-6 mb-6 mx-4 sm:mx-8 lg:mx-[150px]">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">LinkedIn Accounts</h2>
          <LinkedInAccounts 
            onAccountSelect={setSelectedAccountId}
            selectedAccountId={selectedAccountId}
            onAccountCountChange={setAccountCount}
            onAccountsChange={setAccounts}
          />
        </div>

        {/* AI Post Generator */}
        <div className="bg-white rounded-lg shadow p-6 mx-4 sm:mx-8 lg:mx-[300px]">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Generate Post with AI</h2>
          <div className="space-y-4">
            {/* textarea with send icon overlay; Enter (no Shift) sends */}
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleGeneratePost()
                  }
                }}
                placeholder="Describe what you want to post about... (Press Enter to send, Shift+Enter for newline)"
                className="w-full p-4 border border-gray-300 rounded-lg resize-none h-28 pr-14 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleGeneratePost}
                disabled={isGenerating || !prompt.trim()}
                aria-label="Generate post"
                className="absolute right-3 bottom-3 inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {/* show spinner while generating, otherwise show a simple right-arrow */}
                {isGenerating ? (
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.25" />
                    <path d="M22 12a10 10 0 00-10-10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
 
            {/* note: image generation is automatic for every request */}
            <div className="text-sm text-gray-500">AI-generated image will be produced for every generation.</div>

            {/* minimal skeleton while generating */}
            {isGenerating && !generatedPost && (
              <div className="mt-4 p-4 bg-gray-100 rounded animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-3 w-3/4" />
                <div className="h-4 bg-gray-200 rounded mb-2 w-full" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            )}
            {generatedPost && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Generated Post</h3>
                
                <div className="max-w-2xl mx-auto px-4"> {/* Added container with max-width */}
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