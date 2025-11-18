import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from "@tanstack/react-query";
import { io } from 'socket.io-client'
import api from '../utils/api'
import toast from 'react-hot-toast'
import {
  CloudArrowUpIcon,
  VideoCameraIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  SparklesIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  SignalSlashIcon,
} from '@heroicons/react/24/outline'

export default function Upload() {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState(null)
  const [processingMessage, setProcessingMessage] = useState('')
  const [currentSecond, setCurrentSecond] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [processedFrames, setProcessedFrames] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [videoId, setVideoId] = useState(null)
  const navigate = useNavigate()

  // Check native host status
  const { data: nativeHostStatus, isLoading: checkingNativeHost, refetch: refetchNativeHostStatus } = useQuery({
    queryKey: ['nativeHostStatus'],
    queryFn: async () => {
      const response = await api.get('/videos/native-host-status')
      return response.data
    },
    refetchInterval: 5000, // Check every 5 seconds
    retry: 1,
  })

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData()
      formData.append('video', file)

      const response = await api.post('/videos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          setUploadProgress(percentCompleted)
        },
      })

      return response.data
    },
    onSuccess: (data) => {
      setVideoId(data.video.id)
      setSessionId(data.session_id)
      setProcessingStatus('processing')
      setProcessingMessage('Starting AI-powered video analysis...')
      toast.success('Video uploaded! Starting AI analysis...')

      const socket = io('http://localhost:5000')

      socket.on('video_upload_progress', (progressData) => {
        if (progressData.video_id !== data.video.id) return

        setProcessingProgress(progressData.progress || 0)
        setProcessingMessage(progressData.message || 'Processing...')

        if (progressData.current_second !== undefined) {
          setCurrentSecond(progressData.current_second)
        }
        if (progressData.total_seconds) {
          setTotalSeconds(progressData.total_seconds)
        }
        if (progressData.processed_frames !== undefined) {
          setProcessedFrames(progressData.processed_frames)
        }

        if (progressData.status === 'completed' || progressData.progress >= 100) {
          setProcessingStatus('completed')
          const completedSessionId = progressData.session_id || data.session_id
          setSessionId(completedSessionId)
          socket.disconnect()
          toast.success('Video analysis completed!')
        }
      })

      socket.on('video_upload_error', (errorData) => {
        if (errorData.video_id !== data.video.id) return
        setProcessingStatus('failed')
        setProcessingMessage(errorData.error || 'Processing failed')
        toast.error('Video processing failed')
        socket.disconnect()
      })
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Upload failed')
      setProcessingStatus('failed')
    },
  })

  const onDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0]

      if (file) {
        // Check if native host is connected before allowing upload
        if (!nativeHostStatus?.connected) {
          toast.error('AI inference server is not running. Please start the server and try again.')
          return
        }

        const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm']
        if (!allowedTypes.includes(file.type)) {
          toast.error('Invalid file type. Please upload a video file (MP4, AVI, MOV, MKV, WEBM).')
          return
        }

        const maxSize = 500 * 1024 * 1024
        if (file.size > maxSize) {
          toast.error('File too large. Maximum size: 500MB')
          return
        }

        setUploadProgress(0)
        setProcessingProgress(0)
        setProcessingStatus(null)
        setProcessingMessage('')
        setCurrentSecond(0)
        setTotalSeconds(0)
        setProcessedFrames(0)

        uploadMutation.mutate(file)
      }
    },
    [uploadMutation, nativeHostStatus]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm'],
    },
    multiple: false,
    disabled: uploadMutation.isPending || processingStatus === 'processing' || !nativeHostStatus?.connected,
  })

  return (
    <div className="space-y-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex p-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-6 shadow-lg">
            <VideoCameraIcon className="h-16 w-16 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            AI Video Analysis
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload your video and let our advanced AI detect deepfakes with precision
          </p>
        </div>

        {/* Native Host Status Banner */}
        {!checkingNativeHost && (
          <div className={`mb-6 rounded-2xl border-2 p-5 ${
            nativeHostStatus?.connected
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
          }`}>
            <div className="flex items-center gap-4">
              {nativeHostStatus?.connected ? (
                <>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <SignalIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-green-900">AI Server Online</p>
                    <p className="text-sm text-green-700">{nativeHostStatus.message}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-red-100 rounded-xl">
                    <SignalSlashIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-red-900">AI Server Offline</p>
                    <p className="text-sm text-red-700">
                      {nativeHostStatus?.message || 'Cannot connect to inference server'}
                    </p>
                  </div>
                  <button
                    onClick={() => refetchNativeHostStatus()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium transition-all hover:bg-red-700"
                  >
                    Retry Connection
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div className="bg-white rounded-3xl shadow-lg border-2 border-gray-200 overflow-hidden">
          {!processingStatus && (
            <div className="p-12">
              <div
                {...getRootProps()}
                className={`border-3 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 scale-[1.02]'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                } ${uploadMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} />
                <div className={`inline-flex p-6 rounded-2xl mb-6 ${
                  isDragActive ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <CloudArrowUpIcon className={`h-20 w-20 ${
                    isDragActive ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                </div>
                {isDragActive ? (
                  <div>
                    <p className="text-2xl font-bold text-blue-600 mb-2">
                      Drop your video here
                    </p>
                    <p className="text-base text-blue-500">
                      Release to start uploading
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-gray-900 mb-3">
                      Drag & drop your video file
                    </p>
                    <p className="text-lg text-gray-600 mb-6">
                      or click to browse from your computer
                    </p>
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold transition-all hover:bg-gray-800 hover:shadow-lg">
                      <CloudArrowUpIcon className="h-5 w-5" />
                      Choose Video File
                    </div>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500">
                      <span className="px-3 py-1 bg-gray-100 rounded-lg font-medium">MP4</span>
                      <span className="px-3 py-1 bg-gray-100 rounded-lg font-medium">AVI</span>
                      <span className="px-3 py-1 bg-gray-100 rounded-lg font-medium">MOV</span>
                      <span className="px-3 py-1 bg-gray-100 rounded-lg font-medium">MKV</span>
                      <span className="px-3 py-1 bg-gray-100 rounded-lg font-medium">WEBM</span>
                      <span className="text-gray-400">•</span>
                      <span className="font-semibold text-gray-700">Max 500MB</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadMutation.isPending && uploadProgress < 100 && (
            <div className="p-12">
              <div className="text-center mb-6">
                <div className="inline-flex p-4 bg-blue-100 rounded-2xl mb-4">
                  <ArrowPathIcon className="h-12 w-12 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Uploading Video</h3>
                <p className="text-gray-600">Please wait while we upload your file...</p>
              </div>
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">Upload Progress</span>
                  <span className="text-2xl font-bold text-gray-900">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Processing Status */}
          {processingStatus && (
            <div className="p-12">
              {processingStatus === 'processing' && (
                <div>
                  <div className="text-center mb-8">
                    <div className="inline-flex p-5 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl mb-4">
                      <SparklesIcon className="h-14 w-14 text-purple-600 animate-pulse" />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-3">
                      AI Analysis in Progress
                    </h3>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                      {processingMessage}
                    </p>
                  </div>

                  <div className="max-w-3xl mx-auto space-y-6">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-gray-700">Analysis Progress</span>
                        <span className="text-3xl font-bold text-gray-900">
                          {processingProgress.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden shadow-inner">
                        <div
                          className="bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 h-5 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                          style={{ width: `${processingProgress}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    {totalSeconds > 0 && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-2xl border border-blue-200">
                          <p className="text-sm font-semibold text-blue-700 mb-2">Time Analyzed</p>
                          <p className="text-3xl font-bold text-blue-600">{currentSecond}s</p>
                          <p className="text-sm text-blue-600 mt-1">of {totalSeconds}s</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-200">
                          <p className="text-sm font-semibold text-purple-700 mb-2">Frames Processed</p>
                          <p className="text-3xl font-bold text-purple-600">{processedFrames}</p>
                          <p className="text-sm text-purple-600 mt-1">analyzed</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200">
                          <p className="text-sm font-semibold text-green-700 mb-2">Completion</p>
                          <p className="text-3xl font-bold text-green-600">
                            {Math.round((currentSecond / totalSeconds) * 100)}%
                          </p>
                          <p className="text-sm text-green-600 mt-1">complete</p>
                        </div>
                      </div>
                    )}

                    {/* Info Message */}
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-100 rounded-xl">
                          <SparklesIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-blue-900 mb-1">AI Processing Your Video</p>
                          <p className="text-sm text-blue-700">
                            Our advanced neural network is analyzing each frame for deepfake indicators. 
                            Progress updates in real-time every second.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {processingStatus === 'completed' && (
                <div className="max-w-3xl mx-auto">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300 rounded-3xl p-10">
                    <div className="text-center mb-8">
                      <div className="inline-flex p-6 bg-green-200 rounded-2xl mb-6">
                        <CheckCircleIcon className="h-16 w-16 text-green-700" />
                      </div>
                      <h3 className="text-4xl font-bold text-green-900 mb-3">
                        Analysis Complete! 🎉
                      </h3>
                      <p className="text-lg text-green-800">
                        {processingMessage}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-green-200">
                      <div className="grid grid-cols-2 gap-6 text-center">
                        <div>
                          <p className="text-sm font-semibold text-gray-600 mb-1">Total Frames</p>
                          <p className="text-3xl font-bold text-gray-900">{processedFrames}</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-600 mb-1">Video Duration</p>
                          <p className="text-3xl font-bold text-gray-900">{totalSeconds}s</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => navigate(`/analytics/${sessionId}`)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 border-2 border-transparent text-base font-bold rounded-xl shadow-lg text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all hover:shadow-xl hover:-translate-y-0.5"
                      >
                        <ChartBarIcon className="h-6 w-6" />
                        View Detailed Results
                      </button>
                      
                      <button
                        onClick={() => {
                          setProcessingStatus(null)
                          setUploadProgress(0)
                          setProcessingProgress(0)
                          setSessionId(null)
                          setVideoId(null)
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 border-2 border-green-300 text-base font-bold rounded-xl text-green-800 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all"
                      >
                        <CloudArrowUpIcon className="h-6 w-6" />
                        Upload Another Video
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {processingStatus === 'failed' && (
                <div className="max-w-2xl mx-auto">
                  <div className="bg-gradient-to-br from-red-50 to-rose-100 border-2 border-red-300 rounded-3xl p-10">
                    <div className="text-center mb-6">
                      <div className="inline-flex p-6 bg-red-200 rounded-2xl mb-6">
                        <XCircleIcon className="h-16 w-16 text-red-700" />
                      </div>
                      <h3 className="text-3xl font-bold text-red-900 mb-3">
                        Processing Failed
                      </h3>
                      <p className="text-lg text-red-800 mb-8">
                        {processingMessage}
                      </p>
                      <button
                        onClick={() => {
                          setProcessingStatus(null)
                          setUploadProgress(0)
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold transition-all hover:bg-red-700 hover:shadow-lg"
                      >
                        <ArrowPathIcon className="h-5 w-5" />
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-10 bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-6">
            <h3 className="text-2xl font-bold text-white">How It Works</h3>
          </div>
          <div className="p-8">
            <div className="grid gap-6">
              {[
                {
                  step: '1',
                  title: 'Upload Your Video',
                  description: 'Drag and drop or select a video file (MP4, AVI, MOV, MKV, WEBM) up to 500MB',
                  color: 'blue',
                },
                {
                  step: '2',
                  title: 'AI Frame Extraction',
                  description: 'Our system automatically extracts frames at optimal intervals for thorough analysis',
                  color: 'purple',
                },
                {
                  step: '3',
                  title: 'Real-Time Processing',
                  description: 'Watch live progress updates as each second of your video is analyzed by our neural network',
                  color: 'indigo',
                },
                {
                  step: '4',
                  title: 'Detailed Results',
                  description: 'View comprehensive results with frame-by-frame predictions, confidence scores, and interactive charts',
                  color: 'green',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-6 items-start">
                  <div className={`shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-${item.color}-500 to-${item.color}-600 text-white text-xl font-bold shadow-lg`}>
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h4>
                    <p className="text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}