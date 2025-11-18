import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../utils/api'
import toast from 'react-hot-toast'
import PublicNavbar from '../components/PublicNavbar'
import {
  VideoCameraIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ArrowRightIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  CpuChipIcon,
  LockClosedIcon,
  BoltIcon,
  UserGroupIcon,
  SignalIcon,
  SignalSlashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <PublicNavbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-full mb-8 shadow-lg">
              <SparklesIcon className="h-4 w-4 mr-2" />
              99.5% Detection Accuracy
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-6">
              Detect Deepfakes
              <span className="block mt-2 bg-gradient-to-r from-gray-700 via-gray-900 to-gray-700 bg-clip-text text-transparent">
                With Confidence
              </span>
            </h1>
            
            <p className="mt-6 max-w-3xl mx-auto text-xl sm:text-2xl text-gray-600 leading-relaxed">
              Advanced AI-powered deepfake detection for videos. Upload your video and get instant analysis with confidence scores, detailed frame-by-frame results, and visual insights.
            </p>
            
            <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => document.getElementById('free-upload').scrollIntoView({ behavior: 'smooth' })}
                className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Try Free Analysis
                <ArrowRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-900 bg-white border-2 border-gray-900 rounded-xl hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Create Free Account
              </Link>
            </div>

            <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-gray-900 mr-2" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-gray-900 mr-2" />
                100% Free to start
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-gray-900 mr-2" />
                Instant results
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="bg-white py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Powered by Advanced AI
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our ensemble detection system combines multiple state-of-the-art models to deliver the most accurate deepfake detection available.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={VideoCameraIcon}
              title="Frame-by-Frame Analysis"
              description="Every single frame is analyzed by our AI models to detect even the subtlest signs of manipulation, ensuring no deepfake goes undetected."
            />
            <FeatureCard
              icon={ShieldCheckIcon}
              title="Ensemble Detection"
              description="Three independent AI models vote on each frame's authenticity. This multi-model approach dramatically reduces false positives and ensures reliable results."
            />
            <FeatureCard
              icon={BoltIcon}
              title="Real-Time Results"
              description="Watch as our AI processes your video in real-time. Get instant feedback with live progress tracking and frame-by-frame confidence scores."
            />
            <FeatureCard
              icon={CpuChipIcon}
              title="Advanced AI Models"
              description="Leveraging EfficientNet-B4, Xception, and ResNet-50 architectures, trained on millions of real and synthetic video samples."
            />
            <FeatureCard
              icon={LockClosedIcon}
              title="Privacy First"
              description="Your videos are processed securely and deleted immediately after analysis. We never store your content without explicit permission."
            />
            <FeatureCard
              icon={ChartBarIcon}
              title="Detailed Analytics"
              description="Get comprehensive insights with confidence scores, frame breakdowns, visual timelines, and exportable reports for your records."
            />
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Simple, Fast, Accurate
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our streamlined process delivers professional-grade deepfake detection in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <ProcessStep
              number="1"
              title="Upload Video"
              description="Drag and drop or select your video file. We support all major formats up to 100MB."
            />
            <ProcessStep
              number="2"
              title="AI Analysis"
              description="Our ensemble of three AI models analyzes each frame for signs of manipulation."
            />
            <ProcessStep
              number="3"
              title="Get Results"
              description="Receive a comprehensive verdict with confidence scores and detailed breakdown."
            />
            <ProcessStep
              number="4"
              title="Take Action"
              description="Use the insights to verify authenticity, save reports, or share findings."
            />
          </div>
        </div>
      </div>

      {/* Free Upload Section */}
      <div id="free-upload" className="bg-white py-20 lg:py-28 border-y border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Try It Free
            </h2>
            <p className="text-xl text-gray-600">
              Experience our AI-powered detection. Upload a video and see results in seconds—no account required.
            </p>
          </div>
          
          <FreeUploadSection />
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center text-white">
            <StatCard number="99.5%" label="Detection Accuracy" sublabel="On benchmark datasets" />
            <StatCard number="1M+" label="Videos Analyzed" sublabel="And counting daily" />
            <StatCard number="10K+" label="Active Users" sublabel="Worldwide" />
            <StatCard number="3" label="AI Models" sublabel="Working in ensemble" />
          </div>
        </div>
      </div>

      {/* Trust Section */}
      <div className="bg-white py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Trusted by Professionals
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From journalists to researchers, our deepfake detection technology helps protect the integrity of digital media worldwide.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TrustCard
              icon={UserGroupIcon}
              title="Journalists & Media"
              description="Verify video authenticity before publication and protect your credibility with reliable deepfake detection."
            />
            <TrustCard
              icon={ShieldCheckIcon}
              title="Security Teams"
              description="Detect sophisticated video manipulation attempts and safeguard your organization from deepfake threats."
            />
            <TrustCard
              icon={CheckCircleIcon}
              title="Content Creators"
              description="Verify your original content hasn't been deepfaked and protect your brand reputation online."
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Join thousands of users protecting themselves from deepfakes. Start detecting in seconds with our free account.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
          >
            Create Free Account
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center mb-4">
                <ShieldCheckIcon className="h-8 w-8 text-white" />
                <span className="ml-2 text-xl font-bold">SpotifAI</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Advanced deepfake detection powered by AI. Protecting digital media integrity worldwide.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Product</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
                <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Company</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><a href="mailto:support@spotifai.com" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Connect</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition-colors">LinkedIn</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 SpotifAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-gray-900">
      <div className="relative h-14 w-14 bg-gray-900 rounded-xl flex items-center justify-center mb-6 transform group-hover:scale-110 transition-transform duration-300">
        <Icon className="h-7 w-7 text-white" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}

function ProcessStep({ number, title, description }) {
  return (
    <div className="text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-900 text-white text-2xl font-bold mb-4 shadow-lg">
        {number}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function TrustCard({ icon: Icon, title, description }) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all">
      <Icon className="h-12 w-12 text-gray-900 mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}

function StatCard({ number, label, sublabel }) {
  return (
    <div className="transform hover:scale-105 transition-transform duration-300">
      <div className="text-5xl sm:text-6xl font-bold mb-2 text-white">
        {number}
      </div>
      <div className="text-gray-300 text-lg font-semibold">{label}</div>
      <div className="text-gray-500 text-sm mt-1">{sublabel}</div>
    </div>
  )
}

function FreeUploadSection() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processedFrames, setProcessedFrames] = useState(0)
  const [totalFrames, setTotalFrames] = useState(0)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  // Check native host status
  const { data: nativeHostStatus, refetch: refetchNativeHostStatus } = useQuery({
    queryKey: ['nativeHostStatus'],
    queryFn: async () => {
      const response = await api.get('/videos/native-host-status')
      return response.data
    },
    refetchInterval: 5000,
    retry: 1,
  })

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      if (!nativeHostStatus?.connected) {
        toast.error('AI inference server is not running. Please try again later.')
        return
      }

      if (selectedFile.type.startsWith('video/')) {
        const maxSize = 100 * 1024 * 1024 // 100MB for free uploads
        if (selectedFile.size > maxSize) {
          setError('File too large. Maximum size: 100MB for free uploads. Create an account for 500MB limit.')
          toast.error('File too large. Maximum size: 100MB')
          return
        }
        setFile(selectedFile)
        setError(null)
        setResults(null)
        setProcessingProgress(0)
        setProcessedFrames(0)
        setTotalFrames(0)
      } else {
        setError('Please select a valid video file')
        toast.error('Please select a valid video file')
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    if (!nativeHostStatus?.connected) {
      toast.error('AI inference server is not running. Please try again later.')
      return
    }

    setUploading(true)
    setProcessingProgress(0)
    setError(null)
    setResults(null)
    setProcessedFrames(0)
    setTotalFrames(0)

    const formData = new FormData()
    formData.append('video', file)

    try {
      // Use public analyze endpoint - no authentication required
      const response = await fetch('http://localhost:5000/api/public/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'progress') {
                setProcessingProgress(data.progress || 0)
                setProcessedFrames(data.current_frame || 0)
                setTotalFrames(data.total_frames || 0)
              } else if (data.type === 'complete') {
                setResults(data.results)
                setUploading(false)
                setProcessingProgress(100)
                toast.success('Video analysis completed!')
              } else if (data.type === 'error') {
                setError(data.message)
                setUploading(false)
                toast.error(data.message)
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }
    } catch (err) {
      setUploading(false)
      setError(err.message || 'Upload failed. Please try again.')
      toast.error(err.message || 'Upload failed. Please try again.')
    }
  }

  const handleReset = () => {
    setFile(null)
    setResults(null)
    setProcessingProgress(0)
    setError(null)
    setProcessedFrames(0)
    setTotalFrames(0)
  }

  return (
    <div className="space-y-6">
      {/* Native Host Status Banner - Only show when offline */}
      {nativeHostStatus && !nativeHostStatus.connected && (
        <div className="rounded-2xl border-2 p-5 bg-red-50 border-red-300">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <SignalSlashIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-red-900">AI Server Offline</p>
              <p className="text-sm text-red-700">
                {nativeHostStatus?.message || 'Cannot connect to inference server. Please try again later.'}
              </p>
            </div>
            <button
              onClick={() => refetchNativeHostStatus()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium transition-all hover:bg-red-700"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {!results && (
        <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center hover:border-gray-400 hover:bg-gray-50 transition-all">
          <input
            type="file"
            id="video-upload"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading || !nativeHostStatus?.connected}
          />
          <label
            htmlFor="video-upload"
            className={uploading || !nativeHostStatus?.connected ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          >
            <CloudArrowUpIcon className="mx-auto h-24 w-24 text-gray-400 mb-6" />
            <p className="text-2xl font-bold text-gray-900 mb-2">
              {file ? file.name : 'Drop your video here or click to browse'}
            </p>
            <p className="text-gray-500 mb-4">
              Supported formats: MP4, AVI, MOV, MKV, WebM
            </p>
            <p className="text-sm text-gray-400">
              Maximum file size: 100MB (free) • No account required
            </p>
          </label>
        </div>
      )}

      {file && !results && (
        <button
          onClick={handleUpload}
          disabled={uploading || !nativeHostStatus?.connected}
          className="w-full py-5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
        >
          {uploading ? 'Analyzing Video...' : 'Start Free Analysis'}
        </button>
      )}

      {uploading && (
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative mb-6">
              <div className="w-20 h-20 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin"></div>
              <SparklesIcon className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">AI Analysis in Progress</h3>
            <p className="text-gray-600 mb-4">Our AI is analyzing your video for deepfake indicators...</p>
            {totalFrames > 0 && (
              <p className="text-sm text-gray-500">
                Processing frame {processedFrames} of {totalFrames}
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-lg">Error</p>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {results && <ResultsCard results={results} onReset={handleReset} />}
    </div>
  )
}

function ResultsCard({ results, onReset }) {
  const verdict = results.verdict || 'UNKNOWN'
  const confidence = results.confidence || 0
  const totalFrames = results.total_frames || 0
  const fakeCount = results.fake_count || 0
  const realCount = results.real_count || 0
  const noFaceCount = results.no_face_count || 0

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-10 space-y-8 border border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-3xl font-bold text-gray-900">Analysis Complete</h3>
        <button
          onClick={onReset}
          className="text-gray-600 hover:text-gray-900 font-medium transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
        >
          Analyze Another
        </button>
      </div>
      
      <div className={`p-10 rounded-2xl border-2 ${
        verdict === 'FAKE' ? 'bg-red-50 border-red-300' : 
        verdict === 'REAL' ? 'bg-green-50 border-green-300' :
        verdict === 'NO_FACE' ? 'bg-gray-50 border-gray-300' :
        'bg-yellow-50 border-yellow-300'
      }`}>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4">
            Final Verdict
          </p>
          <p className={`text-7xl font-bold mb-4 ${
            verdict === 'FAKE' ? 'text-red-600' : 
            verdict === 'REAL' ? 'text-green-600' :
            verdict === 'NO_FACE' ? 'text-gray-600' :
            'text-yellow-600'
          }`}>
            {verdict === 'NO_FACE' ? 'NO FACE' : verdict}
          </p>
          {confidence > 0 && verdict !== 'NO_FACE' && (
            <p className="text-3xl font-semibold text-gray-700">
              {confidence}% Confidence
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-md">
          <ChartBarIcon className="h-10 w-10 mx-auto text-gray-900 mb-3" />
          <p className="text-3xl font-bold text-gray-900">{totalFrames}</p>
          <p className="text-sm text-gray-600 font-medium">Total Frames</p>
        </div>
        <div className="text-center p-6 bg-gradient-to-br from-red-50 to-white rounded-xl border border-red-200 shadow-md">
          <p className="text-3xl font-bold text-red-600">{fakeCount}</p>
          <p className="text-sm text-gray-600 font-medium">Fake Detected</p>
          <p className="text-xs text-gray-500 mt-1">
            {totalFrames > 0 ? ((fakeCount / totalFrames) * 100).toFixed(1) : 0}%
          </p>
        </div>
        <div className="text-center p-6 bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-200 shadow-md">
          <p className="text-3xl font-bold text-green-600">{realCount}</p>
          <p className="text-sm text-gray-600 font-medium">Real Detected</p>
          <p className="text-xs text-gray-500 mt-1">
            {totalFrames > 0 ? ((realCount / totalFrames) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-8 text-center">
        <ShieldCheckIcon className="h-16 w-16 text-gray-900 mx-auto mb-4" />
        <p className="text-gray-900 font-bold text-xl mb-2">
          Want to save your results and unlock more features?
        </p>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Create a free account to save detection history, access detailed analytics, download reports, and use our browser extension for real-time video verification.
        </p>
        <Link
          to="/signup"
          className="inline-flex items-center px-8 py-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-semibold transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
        >
          Create Free Account
          <ArrowRightIcon className="ml-2 h-5 w-5" />
        </Link>
      </div>
    </div>
  )
}