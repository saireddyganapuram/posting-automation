import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { linkedinAccountsAPI } from '../services/api'
import axios from 'axios'

export default function LinkedInCredentials() {
  const { user } = useUser()
  const [accounts, setAccounts] = useState([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      const response = await linkedinAccountsAPI.getAccounts(user.id)
      const accountsData = Array.isArray(response.data) ? response.data : (response.data.accounts || [])
      console.log('Loaded accounts for credentials:', accountsData)
      setAccounts(accountsData)
      if (accountsData.length > 0 && accountsData[0].linkedinEmail) {
        setHasSavedCredentials(true)
      } else {
        setHasSavedCredentials(false)
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
      setAccounts([])
    }
  }

  const handleSaveCredentials = async () => {
    if (!email || !password) {
      setMessage('Please enter credentials')
      return
    }

    if (accounts.length === 0) {
      setMessage('Please connect a LinkedIn account first')
      return
    }

    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/linkedin-accounts/credentials/${accounts[0]._id}`, {
        email,
        password
      })
      setMessage('✅ Credentials saved successfully')
      setEmail('')
      setPassword('')
      setIsEditing(false)
      loadAccounts()
    } catch (error) {
      setMessage('❌ Error: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setMessage('')
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete saved credentials?')) return

    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/linkedin-accounts/credentials/${accounts[0]._id}`)
      setMessage('✅ Credentials deleted successfully')
      setHasSavedCredentials(false)
      setIsEditing(false)
      setEmail('')
      setPassword('')
      loadAccounts()
    } catch (error) {
      setMessage('❌ Error: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEmail('')
    setPassword('')
    setMessage('')
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">LinkedIn Account Credentials</h2>
      <p className="text-sm text-gray-600 mb-4">
        Add credentials to enable automatic engagement actions
      </p>

      <div className="space-y-4">
        {hasSavedCredentials && !isEditing ? (
          <div>
            <div className="p-4 bg-green-50 border border-green-200 rounded mb-4">
              <p className="text-green-800 font-medium">✅ Credentials saved</p>
              <p className="text-green-700 text-sm mt-1">Email: {accounts[0]?.linkedinEmail}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Edit Credentials
              </button>
              <button
                onClick={handleDelete}
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

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">LinkedIn Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveCredentials}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Save Credentials
              </button>
              {isEditing && (
                <button
                  onClick={handleCancel}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {message && (
          <div className={`p-3 rounded ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
