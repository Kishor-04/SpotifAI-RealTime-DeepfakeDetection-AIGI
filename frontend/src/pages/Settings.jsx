import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import {
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserCircleIcon,
  KeyIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showToken, setShowToken] = useState(false)
  const [activeTab, setActiveTab] = useState('extension')
  const queryClient = useQueryClient()

  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
  })

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const [deletePassword, setDeletePassword] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: linkStatus, isLoading } = useQuery({
    queryKey: ['extension-link-status'],
    queryFn: async () => {
      const response = await api.get('/extension/status')
      return response.data
    },
  })

  const linkMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/extension/link')
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['extension-link-status'])
      setShowToken(true)
      toast.success('Extension linked successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to link extension')
    },
  })

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/extension/unlink')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['extension-link-status'])
      setShowToken(false)
      toast.success('Extension unlinked successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to unlink extension')
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/auth/update-profile', data)
      return response.data
    },
    onSuccess: (data) => {
      toast.success('Profile updated successfully!')
      localStorage.setItem('user', JSON.stringify(data.user))
      window.location.reload()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update profile')
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/auth/change-password', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Password changed successfully!')
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to change password')
    },
  })

  const deleteAccountMutation = useMutation({
    mutationFn: async (password) => {
      const body = user?.oauth_provider === 'email' ? { password } : {}
      const response = await api.delete('/auth/delete-account', { data: body })
      return response.data
    },
    onSuccess: () => {
      toast.success('Account deleted successfully')
      logout()
      navigate('/login', { replace: true })
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete account')
    },
  })

  const handleCopyToken = () => {
    if (linkMutation.data?.extension_token) {
      navigator.clipboard.writeText(linkMutation.data.extension_token)
      toast.success('Token copied to clipboard!')
    }
  }

  const handleProfileSubmit = (e) => {
    e.preventDefault()
    if (profileData.username.length < 3) {
      toast.error('Username must be at least 3 characters')
      return
    }
    updateProfileMutation.mutate(profileData)
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    if (passwordData.new_password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    changePasswordMutation.mutate({
      current_password: passwordData.current_password,
      new_password: passwordData.new_password,
    })
  }

  const handleDeleteAccount = () => {
    if (user?.oauth_provider === 'email' && !deletePassword) {
      toast.error('Please enter your password')
      return
    }
    deleteAccountMutation.mutate(deletePassword)
  }

  const tabs = [
    { id: 'extension', name: 'Browser Extension', icon: LinkIcon },
    { id: 'profile', name: 'Profile', icon: UserCircleIcon },
    { id: 'password', name: 'Security', icon: KeyIcon },
    { id: 'danger', name: 'Danger Zone', icon: TrashIcon },
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gray-900 rounded-xl">
            <ShieldCheckIcon className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Account Settings</h1>
            <p className="mt-2 text-base text-gray-600">
              Manage your profile, security, and browser extension integration
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-8 py-5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap
                  ${
                    activeTab === tab.id
                      ? 'border-gray-900 text-gray-900 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon className="h-5 w-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-8">
          {/* Extension Tab */}
          {activeTab === 'extension' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Browser Extension</h2>
                <p className="text-base text-gray-600">
                  Connect your browser extension to sync detection data across devices
                </p>
              </div>

              {/* Status Card */}
              <div className={`p-8 rounded-2xl border-2 ${
                linkStatus?.is_linked 
                  ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-300' 
                  : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-4 rounded-xl ${
                      linkStatus?.is_linked ? 'bg-green-200' : 'bg-gray-200'
                    }`}>
                      {linkStatus?.is_linked ? (
                        <CheckCircleIcon className="h-8 w-8 text-green-700" />
                      ) : (
                        <XCircleIcon className="h-8 w-8 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 mb-1">
                        Extension Status: {' '}
                        <span className={linkStatus?.is_linked ? 'text-green-700' : 'text-gray-600'}>
                          {linkStatus?.is_linked ? 'Connected' : 'Not Connected'}
                        </span>
                      </p>
                      {linkStatus?.is_linked && linkStatus.linked_at && (
                        <p className="text-sm text-gray-700 mb-1">
                          Connected on {format(new Date(linkStatus.linked_at), 'MMMM dd, yyyy')}
                        </p>
                      )}
                      {linkStatus?.is_linked && linkStatus.last_sync_at && (
                        <p className="text-sm text-gray-600">
                          Last synced {format(new Date(linkStatus.last_sync_at), 'PPp')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    {linkStatus?.is_linked ? (
                      <button
                        onClick={() => unlinkMutation.mutate()}
                        disabled={unlinkMutation.isPending}
                        className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold transition-all hover:bg-red-700 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {unlinkMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    ) : (
                      <button
                        onClick={() => linkMutation.mutate()}
                        disabled={linkMutation.isPending}
                        className="px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold transition-all hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {linkMutation.isPending ? 'Generating...' : 'Connect Extension'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Token Display */}
              {showToken && linkMutation.data?.extension_token && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-100 border-2 border-blue-300 rounded-2xl p-8">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-200 rounded-xl">
                      <LinkIcon className="h-6 w-6 text-blue-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-blue-900 mb-2">
                        Extension Token Generated
                      </h3>
                      <p className="text-sm text-blue-800 mb-4">
                        Copy this token and paste it into your browser extension settings to complete the connection:
                      </p>
                      <div className="bg-white border-2 border-blue-400 rounded-xl p-4 mb-4">
                        <code className="text-sm text-gray-900 break-all font-mono">
                          {linkMutation.data.extension_token}
                        </code>
                      </div>
                      <button
                        onClick={handleCopyToken}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold transition-all hover:bg-blue-700 hover:shadow-md"
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white text-sm font-bold">1</span>
                  How to Connect Your Extension
                </h4>
                <ol className="space-y-4 ml-10">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-900 text-xs font-bold">1</span>
                    <span className="text-gray-700">Click "Connect Extension" to generate a unique secure token</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-900 text-xs font-bold">2</span>
                    <span className="text-gray-700">Copy the generated token to your clipboard</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-900 text-xs font-bold">3</span>
                    <span className="text-gray-700">Open your SpotifAI browser extension settings</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-900 text-xs font-bold">4</span>
                    <span className="text-gray-700">Paste the token in the "Account Linking" section</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-900 text-xs font-bold">5</span>
                    <span className="text-gray-700">Click "Link Account" and you're all set!</span>
                  </li>
                </ol>
              </div>

              {/* Benefits */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300 rounded-2xl p-8">
                <h4 className="text-lg font-bold text-green-900 mb-4">✨ Benefits of Connecting</h4>
                <ul className="space-y-3">
                  {[
                    'Automatically save all detection history from your browser',
                    'Access unified analytics across web uploads and extension',
                    'View all detection sessions in one centralized dashboard',
                    'Export comprehensive detection reports with all your data',
                    'Seamlessly sync data across multiple devices',
                  ].map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-green-800">
                      <CheckCircleIcon className="h-6 w-6 shrink-0 text-green-600 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Information</h2>
                <p className="text-base text-gray-600">
                  Update your account profile information and email address
                </p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div>
                  <label htmlFor="username" className="block text-sm font-bold text-gray-900 mb-3">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-gray-300 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-medium"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-gray-900 mb-3">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-gray-300 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-medium"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-6 border-t-2 border-gray-200">
                  {user?.oauth_provider === 'google' && (
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                      <CheckCircleIcon className="h-5 w-5" />
                      Connected via Google
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="ml-auto px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold transition-all hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {updateProfileMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Security Settings</h2>
                <p className="text-base text-gray-600">
                  Update your password to keep your account secure
                </p>
              </div>

              {user?.oauth_provider !== 'email' ? (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-100 border-2 border-blue-300 rounded-2xl p-8">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-200 rounded-xl">
                      <ShieldCheckIcon className="h-6 w-6 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-900 mb-2">OAuth Authentication</p>
                      <p className="text-blue-800">
                        You are signed in with <span className="font-bold">{user?.oauth_provider}</span>. 
                        Password management is handled by your OAuth provider for enhanced security.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="current_password" className="block text-sm font-bold text-gray-900 mb-3">
                      Current Password
                    </label>
                    <input
                      type="password"
                      id="current_password"
                      value={passwordData.current_password}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, current_password: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-gray-300 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="new_password" className="block text-sm font-bold text-gray-900 mb-3">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="new_password"
                      value={passwordData.new_password}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, new_password: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-gray-300 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-medium"
                      required
                    />
                    <p className="mt-2 text-sm text-gray-600 font-medium">
                      Must be at least 8 characters long
                    </p>
                  </div>

                  <div>
                    <label htmlFor="confirm_password" className="block text-sm font-bold text-gray-900 mb-3">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirm_password"
                      value={passwordData.confirm_password}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirm_password: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-gray-300 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-medium"
                      required
                    />
                  </div>

                  <div className="pt-6 border-t-2 border-gray-200">
                    <button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold transition-all hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {changePasswordMutation.isPending ? 'Updating Password...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-red-600 mb-2">Danger Zone</h2>
                <p className="text-base text-gray-600">
                  Irreversible actions that permanently affect your account
                </p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-rose-100 border-2 border-red-300 rounded-2xl p-8">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-200 rounded-xl">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-red-900 mb-3">Delete Account Permanently</h3>
                    <div className="text-red-800 mb-4">
                      <p className="mb-3 font-semibold">This action cannot be undone. Deleting your account will permanently:</p>
                      <ul className="space-y-2 ml-4">
                        {[
                          'Delete your profile and all account information',
                          'Remove all your detection sessions and analytics',
                          'Delete all frame analysis data and history',
                          'Revoke access to all features and services',
                          'Disconnect any linked browser extensions',
                        ].map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-red-600 mt-1">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold"
                      >
                        I Understand, Delete My Account
                      </button>
                    ) : (
                      <div className="space-y-4 bg-white p-6 rounded-xl border-2 border-red-400">
                        <p className="text-red-900 font-bold text-lg">⚠️ Final Confirmation Required</p>
                        {user?.oauth_provider === 'email' && (
                          <div>
                            <label className="block text-sm font-bold text-red-900 mb-2">
                              Enter your password to confirm deletion
                            </label>
                            <input
                              type="password"
                              value={deletePassword}
                              onChange={(e) => setDeletePassword(e.target.value)}
                              className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-red-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 font-medium"
                              placeholder="Enter your password"
                            />
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleteAccountMutation.isPending}
                            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold disabled:opacity-50"
                          >
                            {deleteAccountMutation.isPending ? 'Deleting Account...' : 'Yes, Delete My Account Forever'}
                          </button>
                          <button
                            onClick={() => {
                              setShowDeleteConfirm(false)
                              setDeletePassword('')
                            }}
                            disabled={deleteAccountMutation.isPending}
                            className="px-6 py-3 bg-gray-200 text-gray-900 rounded-xl hover:bg-gray-300 transition-all font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}