import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../utils/api'
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  VideoCameraIcon,
  CloudArrowUpIcon,
  ChartBarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

export default function Analytics() {
  const [sourceFilter, setSourceFilter] = useState('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', sourceFilter, page],
    queryFn: async () => {
      const response = await api.get('/analytics/sessions', {
        params: {
          page,
          per_page: 20,
          source: sourceFilter,
        },
      })
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const sessions = data?.sessions || []
  const pagination = data?.pagination || {}

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-900 rounded-xl">
                <ChartBarIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Analytics Hub</h1>
                <p className="mt-2 text-base text-gray-600">
                  Track and analyze all your deepfake detection sessions
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span>Real-time tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-900"></div>
                <span>Detailed insights</span>
              </div>
            </div>
          </div>
          <Link 
            to="/upload" 
            className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium transition-all hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            New Analysis
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="p-2.5 bg-gray-100 rounded-lg">
              <FunnelIcon className="h-5 w-5 text-gray-700" />
            </div>
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Source
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="all">All Sources</option>
                <option value="extension">Browser Extension</option>
                <option value="web_upload">Web Uploads</option>
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{sessions.length}</span> session{sessions.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden">
        {sessions.length > 0 ? (
          <>
            <div className="divide-y divide-gray-100">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  to={`/analytics/${session.id}`}
                  className="block hover:bg-gray-50 transition-all group"
                >
                  <div className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      {/* Icon */}
                      <div className="shrink-0">
                        {session.source === 'extension' ? (
                          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <VideoCameraIcon className="h-7 w-7 text-green-600" />
                          </div>
                        ) : (
                          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-100 border border-blue-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <CloudArrowUpIcon className="h-7 w-7 text-blue-600" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {session.source === 'extension'
                              ? session.video_title || 'Browser Extension Detection'
                              : `Video Upload Session #${session.id}`}
                          </h3>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium ${
                              session.source === 'extension'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {session.source === 'extension' ? 'Extension' : 'Web Upload'}
                          </span>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <span className="flex items-center gap-2">
                            <ClockIcon className="h-4 w-4" />
                            {format(new Date(session.started_at), 'MMM dd, yyyy • h:mm a')}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
                            {session.total_frames} frames
                          </span>
                          <span className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
                            {session.fps} FPS
                          </span>
                        </div>
                        {session.video_url && (
                          <p className="mt-2 text-xs text-gray-500 truncate max-w-2xl">
                            {session.video_url}
                          </p>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className="shrink-0">
                        <div className="p-2 rounded-lg group-hover:bg-gray-100 transition-colors">
                          <svg
                            className="h-5 w-5 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="bg-gray-50 px-8 py-5 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">
                    Page <span className="font-semibold">{page}</span> of{' '}
                    <span className="font-semibold">{pagination.pages}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-5 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-xl font-medium transition-all hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                      disabled={page === pagination.pages}
                      className="px-5 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-xl font-medium transition-all hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="inline-flex p-4 bg-gray-100 rounded-2xl mb-4">
              <MagnifyingGlassIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No sessions found</h3>
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              {sourceFilter !== 'all'
                ? 'Try changing the filter to see more sessions, or start a new analysis'
                : 'Upload your first video or use the browser extension to begin detecting deepfakes'}
            </p>
            <Link 
              to="/upload" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium transition-all hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5"
            >
              <SparklesIcon className="h-5 w-5" />
              Start First Analysis
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}