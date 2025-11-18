import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Google OAuth Callback Handler
 * This page extracts the ID token from the URL fragment and sends it to the opener window
 */
function GoogleCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // Parse the URL fragment to extract the access token
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const idToken = params.get('id_token')
    const error = params.get('error')

    if (error) {
      // Send error to opener
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: error
        }, window.location.origin)
        window.close()
      } else {
        navigate('/login')
      }
      return
    }

    if (idToken) {
      // Send the ID token to the opener window
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          token: idToken
        }, window.location.origin)
        window.close()
      } else {
        // If opened directly, redirect to login
        navigate('/login')
      }
    } else {
      // No token found
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: 'no_token'
        }, window.location.origin)
        window.close()
      } else {
        navigate('/login')
      }
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing Google authentication...</p>
      </div>
    </div>
  )
}

export default GoogleCallback
