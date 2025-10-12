import { useEffect } from 'react'

export default function SuccessPopup({ show, message, onClose }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm mx-4 animate-bounce">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Success!</h3>
            <p className="text-gray-600">{message}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="mt-4 w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
        >
          Close
        </button>
      </div>
    </div>
  )
}