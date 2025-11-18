import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import api from '../utils/api'
import { Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import {
  ChartBarIcon,
  VideoCameraIcon,
  ClockIcon,
  CpuChipIcon,
  ArrowPathIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function Dashboard() {
  const { user } = useAuth()

  const { data: dashboardStats, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/analytics/dashboard-stats')
      return response.data
    },
    retry: false,
    refetchOnMount: true,
    refetchInterval: 5000,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const overview = dashboardStats?.overview || {}
  const recentActivity = dashboardStats?.recent_activity || {}
  const distribution = dashboardStats?.detection_distribution || {}
  const recentSessions = dashboardStats?.recent_sessions || []
  const activityTrend = dashboardStats?.activity_trend || []

  const statCards = [
    {
      name: 'Total Frames',
      value: (overview.total_frames_analyzed || 0).toLocaleString(),
      icon: CpuChipIcon,
      gradient: 'from-purple-500 to-indigo-600',
      change: recentActivity.frames_24h > 0 ? `+${recentActivity.frames_24h.toLocaleString()} today` : null,
      bg: 'bg-gradient-to-br from-purple-50 to-indigo-50',
      border: 'border-purple-200',
    },
    {
      name: 'Total Sessions',
      value: overview.total_sessions || 0,
      icon: VideoCameraIcon,
      gradient: 'from-blue-500 to-cyan-600',
      change: recentActivity.sessions_24h > 0 ? `+${recentActivity.sessions_24h} today` : null,
      bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
      border: 'border-blue-200',
    },
    {
      name: 'Extension',
      value: overview.extension_sessions || 0,
      icon: ClockIcon,
      gradient: 'from-green-500 to-emerald-600',
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
      border: 'border-green-200',
    },
    {
      name: 'Web Uploads',
      value: overview.web_upload_sessions || 0,
      icon: ChartBarIcon,
      gradient: 'from-orange-500 to-red-600',
      bg: 'bg-gradient-to-br from-orange-50 to-red-50',
      border: 'border-orange-200',
    },
  ]

  const distributionData = {
    labels: ['Real', 'Fake', 'No Face', 'Suspicious'],
    datasets: [
      {
        data: [
          distribution.counts?.REAL || 0,
          distribution.counts?.FAKE || 0,
          distribution.counts?.NO_FACE || 0,
          distribution.counts?.SUSPICIOUS || 0,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(245, 158, 11, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(156, 163, 175)',
          'rgb(245, 158, 11)',
        ],
        borderWidth: 2,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: { size: 13, weight: '500' },
          color: '#374151',
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || ''
            const value = context.parsed || 0
            const percentage = distribution.percentages?.[context.label.toUpperCase().replace(' ', '_')] || 0
            return `${label}: ${value.toLocaleString()} (${percentage}%)`
          },
        },
      },
    },
  }

  const trendData = {
    labels: activityTrend.map(day => format(new Date(day.date), 'MMM dd')),
    datasets: [
      {
        label: 'Frames Analyzed',
        data: activityTrend.map(day => day.frames),
        borderColor: 'rgb(17, 24, 39)',
        backgroundColor: 'rgba(17, 24, 39, 0.05)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(17, 24, 39)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  }

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        padding: 12,
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 13 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: '#6b7280',
          font: { size: 12 },
        },
        grid: {
          color: 'rgba(229, 231, 235, 0.5)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
      },
      x: {
        ticks: {
          color: '#6b7280',
          font: { size: 12 },
        },
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
      },
    },
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black shadow-xl rounded-3xl p-8 sm:p-10 text-white">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
        
        <div className="relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <SparklesIcon className="h-8 w-8 text-yellow-400" />
                <h1 className="text-4xl sm:text-5xl font-bold">
                  Welcome back, {user?.username}!
                </h1>
              </div>
              <p className="text-lg text-gray-300 max-w-2xl">
                Your deepfake detection dashboard is ready. Here's a complete overview of your AI-powered analysis activity.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link 
                  to="/upload"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-xl font-semibold transition-all hover:bg-gray-100 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <VideoCameraIcon className="h-5 w-5" />
                  New Analysis
                </Link>
                <Link 
                  to="/analytics"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold transition-all hover:bg-white/20 border border-white/20"
                >
                  <ChartBarIcon className="h-5 w-5" />
                  View All Sessions
                </Link>
              </div>
            </div>
            <button
              onClick={() => refetch()}
              className="p-4 hover:bg-white/10 rounded-2xl transition-all group backdrop-blur-sm border border-white/10"
              title="Refresh data"
            >
              <ArrowPathIcon className="h-7 w-7 group-hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className={`group relative ${stat.bg} overflow-hidden shadow-sm rounded-2xl hover:shadow-md transition-all duration-300 border ${stat.border}`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                {stat.change && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-lg">
                    <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                    {stat.change}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {stat.name}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detection Distribution */}
        <div className="bg-white shadow-sm rounded-2xl p-8 border border-gray-200">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Detection Distribution
            </h2>
            <p className="text-sm text-gray-600">
              Breakdown of all frame predictions across sessions
            </p>
          </div>
          <div className="h-80">
            {(distribution.counts?.REAL || 0) + (distribution.counts?.FAKE || 0) > 0 ? (
              <Doughnut data={distributionData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <div className="inline-flex p-4 bg-gray-100 rounded-2xl mb-3">
                    <ChartBarIcon className="h-12 w-12 opacity-50" />
                  </div>
                  <p className="font-medium text-gray-900">No detection data yet</p>
                  <p className="text-sm mt-1">Start analyzing videos to see your distribution</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="text-3xl font-bold text-green-600">
                {distribution.counts?.REAL || 0}
              </div>
              <div className="text-sm text-gray-700 mt-1 font-medium">Real Frames</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-200">
              <div className="text-3xl font-bold text-red-600">
                {distribution.counts?.FAKE || 0}
              </div>
              <div className="text-sm text-gray-700 mt-1 font-medium">Fake Frames</div>
            </div>
          </div>
        </div>

        {/* Activity Trend */}
        <div className="bg-white shadow-sm rounded-2xl p-8 border border-gray-200">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              7-Day Activity Trend
            </h2>
            <p className="text-sm text-gray-600">
              Daily frame analysis over the past week
            </p>
          </div>
          <div className="h-80">
            {activityTrend.length > 0 ? (
              <Line data={trendData} options={trendOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <div className="inline-flex p-4 bg-gray-100 rounded-2xl mb-3">
                    <ChartBarIcon className="h-12 w-12 opacity-50" />
                  </div>
                  <p className="font-medium text-gray-900">No activity data yet</p>
                  <p className="text-sm mt-1">Your weekly activity will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-200">
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Recent Sessions</h2>
              <p className="text-sm text-gray-600">Your latest detection analyses</p>
            </div>
            {recentSessions.length > 0 && (
              <Link
                to="/analytics"
                className="text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors flex items-center gap-1"
              >
                View all
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {recentSessions.length > 0 ? (
            recentSessions.map((session) => (
              <Link
                key={session.id}
                to={`/analytics/${session.id}`}
                className="block hover:bg-gray-50 transition-colors group"
              >
                <div className="px-8 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        session.source === 'extension' 
                          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200' 
                          : 'bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200'
                      }`}>
                        {session.source === 'extension' ? (
                          <ClockIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <VideoCameraIcon className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">
                          {session.source === 'extension' ? 'Browser Extension' : 'Web Upload'}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {session.total_frames || 0} frames analyzed
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {session.started_at ? format(new Date(session.started_at), 'MMM dd, yyyy') : 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {session.started_at ? format(new Date(session.started_at), 'h:mm a') : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="px-8 py-16 text-center text-gray-400">
              <div className="inline-flex p-4 bg-gray-100 rounded-2xl mb-4">
                <VideoCameraIcon className="h-12 w-12 opacity-50" />
              </div>
              <p className="font-medium text-gray-900 mb-1">No sessions yet</p>
              <p className="text-sm">Upload a video or use the extension to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          Auto-refreshing every 5 seconds
        </div>
      </div>
    </div>
  )
}