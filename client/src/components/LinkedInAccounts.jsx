import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { linkedinAccountsAPI } from '../services/api'
import axios from 'axios'

export default function LinkedInAccounts({ onAccountSelect, selectedAccountId, onAccountCountChange, onAccountsChange }) {
  const { user } = useUser()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      loadAccounts()
    }
  }, [user])

  const loadAccounts = async () => {
    try {
      const response = await linkedinAccountsAPI.getAccounts(user.id)
      console.log('LinkedIn accounts response:', response.data)
      
      const accountsData = Array.isArray(response.data) ? response.data : (response.data.accounts || [])
      setAccounts(accountsData)
      
      // Notify parent of account count and accounts list
      if (onAccountCountChange) {
        onAccountCountChange(accountsData.length)
      }
      if (onAccountsChange) {
        onAccountsChange(accountsData)
      }
      
      // Auto-select default account if none selected
      if (!selectedAccountId && accountsData.length > 0) {
        const defaultAccount = accountsData.find(acc => acc.isDefault) || accountsData[0]
        onAccountSelect(defaultAccount.id || defaultAccount._id)
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectAccount = async () => {
    try {
      setLoading(true)
      
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/linkedin/auth/${user.id}`)
      
      const width = 600
      const height = 700
      const left = window.innerWidth / 2 - width / 2
      const top = window.innerHeight / 2 - height / 2
      
      // Always open new popup (don't reuse)
      const popup = window.open(
        response.data.url,
        '_blank',
        `width=${width},height=${height},top=${top},left=${left}`
      )
      
      if (!popup) {
        alert('Popup blocked! Please allow popups for this site and try again.')
        setLoading(false)
        return
      }
      
      let messageHandled = false
      
      // Listen for auth completion
      const handleMessage = (event) => {
        if (event.data.type === 'linkedin-auth' && !messageHandled) {
          messageHandled = true
          
          if (event.data.status === 'connected') {
            console.log('✅ LinkedIn account connected:', event.data.name)
            loadAccounts()
          } else if (event.data.status === 'error') {
            console.error('❌ LinkedIn auth error:', event.data.error)
            alert('Failed to connect LinkedIn account: ' + (event.data.error || 'Unknown error'))
          }
          
          window.removeEventListener('message', handleMessage)
          clearInterval(checkClosed)
          setLoading(false)
        }
      }
      
      window.addEventListener('message', handleMessage)
      
      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
          if (!messageHandled) {
            console.log('LinkedIn auth popup closed manually')
            setLoading(false)
          }
        }
      }, 1000)
      
    } catch (error) {
      console.error('Error connecting account:', error)
      alert('Error starting LinkedIn connection: ' + error.message)
      setLoading(false)
    }
  }

  const handleSetDefault = async (accountId) => {
    try {
      await linkedinAccountsAPI.setDefault(user.id, accountId)
      loadAccounts()
    } catch (error) {
      console.error('Error setting default:', error)
    }
  }

  const handleDisconnect = async (accountId) => {
    if (confirm('Are you sure you want to disconnect this LinkedIn account?')) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL}/linkedin-accounts/${user.id}/${accountId}`)
        loadAccounts()
        if (selectedAccountId === accountId) {
          onAccountSelect(null)
        }
      } catch (error) {
        console.error('Error disconnecting account:', error)
      }
    }
  }

  const handleDisconnectAll = async () => {
    if (confirm(`Are you sure you want to disconnect all ${accounts.length} LinkedIn accounts?`)) {
      try {
        await axios.post(`${import.meta.env.VITE_API_URL}/linkedin/disconnect/${user.id}`, { accountId: null })
        loadAccounts()
        onAccountSelect(null)
      } catch (error) {
        console.error('Error disconnecting all accounts:', error)
      }
    }
  }

  if (loading) {
    return <div className="text-center">Loading accounts...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">LinkedIn Accounts ({accounts.length})</h3>
        <div className="flex gap-2">
          {accounts.length > 0 && (
            <button
              onClick={handleDisconnectAll}
              className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 text-sm"
            >
              Disconnect All
            </button>
          )}
          <button
            onClick={handleConnectAccount}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            + Connect Account
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-600 mb-4">No LinkedIn accounts connected</p>
          <button
            onClick={handleConnectAccount}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Connect Your First Account
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id || account._id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedAccountId === account._id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onAccountSelect(account._id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{account.name || account.linkedinName}</h4>
                    {account.isDefault && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                    {account.isLegacy && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                        Legacy
                      </span>
                    )}
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                      {account.type || account.accountType || 'personal'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    ID: {account.linkedinId || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Connected {new Date(account.connectedAt || account.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  {!account.isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSetDefault(account._id)
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDisconnect(account._id)
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {accounts.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          <p>• Click an account to select it for single posting</p>
          <p>• Use "Schedule to All" to post to all {accounts.length} accounts</p>
          <p>• Set a default account for quick posting</p>
          <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-blue-800 font-medium">💡 Connecting Multiple LinkedIn Accounts:</p>
            <div className="text-blue-700 text-xs mt-1 space-y-1">
              <p><strong>Method 1 (Recommended):</strong></p>
              <p>• Use different browsers (Chrome, Firefox, Edge) for each account</p>
              <p>• Or use incognito/private windows</p>
              <p><strong>Method 2:</strong></p>
              <p>• Log out of LinkedIn completely before connecting each new account</p>
              <p>• Click "+ Connect Account" and log in with different credentials</p>
              <p><strong>Note:</strong> LinkedIn may cache sessions, so browser isolation works best</p>
            </div>
          </div>
          
          {accounts.length === 1 && (
            <div className="mt-2 p-3 bg-amber-50 rounded border border-amber-200">
              <p className="text-amber-800 font-medium">⚠️ Single Account Connected:</p>
              <p className="text-amber-700 text-xs mt-1">
                You have one LinkedIn account connected. "Schedule to All" will post once to this account. 
                To post to multiple accounts, follow the steps above to connect different LinkedIn profiles.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}