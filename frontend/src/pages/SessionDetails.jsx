import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../utils/api'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { ArrowLeftIcon, CheckBadgeIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function SessionDetails() {
  const { sessionId } = useParams()
  const [page, setPage] = useState(1)

  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const response = await api.get(`/analytics/sessions/${sessionId}`)
      return response.data
    },
  })

  const { data: framesData, isLoading: framesLoading } = useQuery({
    queryKey: ['session-frames', sessionId, page],
    queryFn: async () => {
      const response = await api.get(`/analytics/sessions/${sessionId}/frames`, {
        params: { page, per_page: 100 },
      })
      return response.data
    },
  })

  if (sessionLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const session = sessionData?.session
  const frames = framesData?.frames || []

  // Prepare chart data
  const chartData = {
    labels: frames.map((f) => f.timestamp.toFixed(1)),
    datasets: [
      {
        label: 'Confidence Score',
        data: frames.map((f) => f.confidence),
        borderColor: frames.map((f) =>
          f.prediction === 'FAKE' ? '#ef4444' : f.prediction === 'REAL' ? '#10b981' : '#6b7280'
        ),
        backgroundColor: frames.map((f) =>
          f.prediction === 'FAKE'
            ? 'rgba(239, 68, 68, 0.1)'
            : f.prediction === 'REAL'
            ? 'rgba(16, 185, 129, 0.1)'
            : 'rgba(107, 114, 128, 0.1)'
        ),
        segment: {
          borderColor: (ctx) => {
            const frame = frames[ctx.p0DataIndex]
            return frame?.prediction === 'FAKE'
              ? '#ef4444'
              : frame?.prediction === 'REAL'
              ? '#10b981'
              : '#6b7280'
          },
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: 12,
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 13 },
        callbacks: {
          label: (context) => {
            const frame = frames[context.dataIndex]
            return `${frame.prediction}: ${frame.confidence.toFixed(2)}%`
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Confidence (%)',
          font: { size: 13, weight: '600' },
          color: '#374151',
        },
        ticks: {
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
        title: {
          display: true,
          text: 'Time (seconds)',
          font: { size: 13, weight: '600' },
          color: '#374151',
        },
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

  // Calculate statistics
  const fakeCount = frames.filter((f) => f.prediction === 'FAKE').length
  const realCount = frames.filter((f) => f.prediction === 'REAL').length
  const noFaceCount = frames.filter((f) => f.prediction === 'NO_FACE').length
  
  const framesWithFaces = frames.filter((f) => f.prediction !== 'NO_FACE')
  const avgConfidence =
    framesWithFaces.length > 0
      ? framesWithFaces.reduce((sum, f) => sum + f.confidence, 0) / framesWithFaces.length
      : 0

  const fakeFrames = frames.filter((f) => f.prediction === 'FAKE')
  const realFrames = frames.filter((f) => f.prediction === 'REAL')
  
  const avgFakeConfidence =
    fakeFrames.length > 0
      ? fakeFrames.reduce((sum, f) => sum + f.confidence, 0) / fakeFrames.length
      : 0
  
  const avgRealConfidence =
    realFrames.length > 0
      ? realFrames.reduce((sum, f) => sum + f.confidence, 0) / realFrames.length
      : 0

  // Determine final verdict
  let verdict = 'INCONCLUSIVE'
  let verdictConfidence = 0
  let verdictIcon = ExclamationTriangleIcon
  let verdictColor = 'gray'
  let verdictBg = 'bg-gradient-to-br from-gray-50 to-gray-100'
  let verdictText = 'text-gray-800'
  let verdictBorder = 'border-gray-300'

  if (fakeFrames.length === 0 && realFrames.length === 0) {
    verdict = 'NO FACES DETECTED'
    verdictColor = 'gray'
    verdictConfidence = 0
  } else if (fakeFrames.length > realFrames.length) {
    verdict = 'FAKE'
    verdictConfidence = avgFakeConfidence
    verdictIcon = XCircleIcon
    verdictColor = 'red'
    verdictBg = 'bg-gradient-to-br from-red-50 to-rose-100'
    verdictText = 'text-red-800'
    verdictBorder = 'border-red-300'
  } else if (realFrames.length > fakeFrames.length) {
    verdict = 'REAL'
    verdictConfidence = avgRealConfidence
    verdictIcon = CheckBadgeIcon
    verdictColor = 'green'
    verdictBg = 'bg-gradient-to-br from-green-50 to-emerald-100'
    verdictText = 'text-green-800'
    verdictBorder = 'border-green-300'
  } else {
    if (avgFakeConfidence > avgRealConfidence) {
      verdict = 'FAKE'
      verdictConfidence = avgFakeConfidence
      verdictIcon = XCircleIcon
      verdictColor = 'red'
      verdictBg = 'bg-gradient-to-br from-red-50 to-rose-100'
      verdictText = 'text-red-800'
      verdictBorder = 'border-red-300'
    } else {
      verdict = 'REAL'
      verdictConfidence = avgRealConfidence
      verdictIcon = CheckBadgeIcon
      verdictColor = 'green'
      verdictBg = 'bg-gradient-to-br from-green-50 to-emerald-100'
      verdictText = 'text-green-800'
      verdictBorder = 'border-green-300'
    }
  }

  const VerdictIcon = verdictIcon

  return (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div>
        <Link
          to="/analytics"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 group"
        >
          <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Analytics
        </Link>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">Session Analysis</h1>
              <p className="text-base text-gray-600">
                Detailed frame-by-frame deepfake detection results
              </p>
            </div>
            
            {/* Verdict Badge */}
            {frames.length > 0 && (
              <div className={`${verdictBg} ${verdictBorder} border-2 rounded-2xl px-8 py-5 shadow-sm min-w-[240px]`}>
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    <VerdictIcon className={`h-12 w-12 ${verdictText}`} />
                  </div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Final Verdict
                  </p>
                  <div className={`text-4xl font-bold ${verdictText} mb-2`}>
                    {verdict === 'NO FACES DETECTED' ? 'NO FACES' : verdict}
                  </div>
                  {verdict !== 'NO FACES DETECTED' && verdict !== 'INCONCLUSIVE' && (
                    <div className={`text-base font-semibold ${verdictText} opacity-80`}>
                      {verdictConfidence.toFixed(1)}% Confidence
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Info Grid */}
      <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Session Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border border-gray-200">
            <p className="text-sm font-medium text-gray-600 mb-2">Source</p>
            <p className="text-xl font-bold text-gray-900 capitalize">
              {session?.source?.replace('_', ' ')}
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border border-gray-200">
            <p className="text-sm font-medium text-gray-600 mb-2">Started At</p>
            <p className="text-xl font-bold text-gray-900">
              {session?.started_at && format(new Date(session.started_at), 'MMM dd, yyyy')}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {session?.started_at && format(new Date(session.started_at), 'h:mm a')}
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border border-gray-200">
            <p className="text-sm font-medium text-gray-600 mb-2">Total Frames</p>
            <p className="text-xl font-bold text-gray-900">
              {session?.total_frames?.toLocaleString()}
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border border-gray-200">
            <p className="text-sm font-medium text-gray-600 mb-2">Frame Rate</p>
            <p className="text-xl font-bold text-gray-900">{session?.fps} FPS</p>
          </div>
        </div>
        
        {session?.video_title && (
          <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Video Title</p>
            <p className="text-base font-semibold text-gray-900">{session.video_title}</p>
          </div>
        )}
        
        {session?.video_url && (
          <div className="mt-4 p-5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Video URL</p>
            <a
              href={session.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline break-all font-medium"
            >
              {session.video_url}
            </a>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-red-50 to-rose-100 shadow-sm rounded-2xl border-2 border-red-200 p-6">
          <p className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-2">Fake Detections</p>
          <p className="text-4xl font-bold text-red-600 mb-2">{fakeCount}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-red-200 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all"
                style={{ width: frames.length > 0 ? `${(fakeCount / frames.length) * 100}%` : '0%' }}
              />
            </div>
            <p className="text-sm font-bold text-red-700">
              {frames.length > 0 ? ((fakeCount / frames.length) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 shadow-sm rounded-2xl border-2 border-green-200 p-6">
          <p className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">Real Detections</p>
          <p className="text-4xl font-bold text-green-600 mb-2">{realCount}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-green-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: frames.length > 0 ? `${(realCount / frames.length) * 100}%` : '0%' }}
              />
            </div>
            <p className="text-sm font-bold text-green-700">
              {frames.length > 0 ? ((realCount / frames.length) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm rounded-2xl border-2 border-gray-300 p-6">
          <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">No Face Detected</p>
          <p className="text-4xl font-bold text-gray-600 mb-2">{noFaceCount}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-300 rounded-full h-2">
              <div 
                className="bg-gray-600 h-2 rounded-full transition-all"
                style={{ width: frames.length > 0 ? `${(noFaceCount / frames.length) * 100}%` : '0%' }}
              />
            </div>
            <p className="text-sm font-bold text-gray-700">
              {frames.length > 0 ? ((noFaceCount / frames.length) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-cyan-100 shadow-sm rounded-2xl border-2 border-blue-200 p-6">
          <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2">Avg Confidence</p>
          <p className="text-4xl font-bold text-blue-600 mb-2">
            {avgConfidence.toFixed(1)}%
          </p>
          <p className="text-sm text-blue-700 font-medium">
            Across {framesWithFaces.length} frames
          </p>
        </div>
      </div>

      {/* Chart */}
      {frames.length > 0 && (
        <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Detection Timeline</h2>
            <p className="text-sm text-gray-600">Confidence scores plotted over video duration</p>
          </div>
          <div style={{ height: '400px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Frame Results Table */}
      <div className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-xl font-bold text-gray-900 mb-1">Frame-Level Results</h3>
          <p className="text-sm text-gray-600">Detailed prediction data for each analyzed frame</p>
        </div>
        {framesLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : frames.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Frame #
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Prediction
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {frames.map((frame) => (
                  <tr key={frame.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-8 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      #{frame.frame_number}
                    </td>
                    <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-600">
                      {frame.timestamp.toFixed(2)}s
                    </td>
                    <td className="px-8 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold ${
                          frame.prediction === 'FAKE'
                            ? 'bg-red-100 text-red-700'
                            : frame.prediction === 'REAL'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {frame.prediction}
                      </span>
                    </td>
                    <td className="px-8 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[120px] bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              frame.prediction === 'FAKE'
                                ? 'bg-red-600'
                                : frame.prediction === 'REAL'
                                ? 'bg-green-600'
                                : 'bg-gray-600'
                            }`}
                            style={{ width: `${frame.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900 min-w-[60px]">
                          {frame.confidence.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium text-gray-900">No frame data available</p>
          </div>
        )}
      </div>
    </div>
  )
}