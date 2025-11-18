import { Link } from 'react-router-dom'
import PublicNavbar from '../components/PublicNavbar'
import {
  ShieldCheckIcon,
  VideoCameraIcon,
  CpuChipIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <PublicNavbar />

      {/* Hero */}
      <div className="relative bg-gradient-to-b from-gray-50 to-white py-16 sm:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-full mb-6">
            <SparklesIcon className="h-4 w-4 mr-2" />
            AI-Powered Detection Technology
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">How It Works</h1>
          <p className="text-xl sm:text-2xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Understanding the science and technology behind our advanced deepfake detection system
          </p>
        </div>
      </div>

      {/* Overview */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-xl border border-gray-200 p-10 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">The Detection Pipeline</h2>
          <p className="text-lg text-gray-600 leading-relaxed text-center max-w-3xl mx-auto mb-8">
            Our system uses a sophisticated four-stage pipeline that combines computer vision, deep learning, 
            and ensemble methods to achieve industry-leading accuracy in deepfake detection.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="h-16 w-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-3 text-white text-2xl font-bold">
                1
              </div>
              <p className="font-semibold text-gray-900">Upload</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-3 text-white text-2xl font-bold">
                2
              </div>
              <p className="font-semibold text-gray-900">Extract</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-3 text-white text-2xl font-bold">
                3
              </div>
              <p className="font-semibold text-gray-900">Analyze</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-3 text-white text-2xl font-bold">
                4
              </div>
              <p className="font-semibold text-gray-900">Report</p>
            </div>
          </div>
        </div>

        {/* Process Steps */}
        <div className="space-y-16">
          {/* Step 1 */}
          <div className="flex gap-8 items-start">
            <div className="shrink-0">
              <div className="h-20 w-20 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center shadow-xl">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-all">
                <div className="flex items-center mb-6">
                  <div className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center mr-4">
                    <VideoCameraIcon className="h-7 w-7 text-gray-900" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Secure Video Upload</h3>
                </div>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  Upload your video file through our secure, encrypted platform. We support all major video 
                  formats including MP4, AVI, MOV, WebM, MKV, and FLV. Your video is transmitted over 
                  TLS 1.3 encryption to ensure complete privacy.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200">
                    <CheckCircleIcon className="h-6 w-6 text-gray-900 mb-2" />
                    <p className="font-semibold text-gray-900 mb-1">Encrypted Upload</p>
                    <p className="text-sm text-gray-600">TLS 1.3 & AES-256 encryption</p>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200">
                    <CheckCircleIcon className="h-6 w-6 text-gray-900 mb-2" />
                    <p className="font-semibold text-gray-900 mb-1">Format Support</p>
                    <p className="text-sm text-gray-600">MP4, AVI, MOV, WebM, MKV, FLV</p>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200">
                    <CheckCircleIcon className="h-6 w-6 text-gray-900 mb-2" />
                    <p className="font-semibold text-gray-900 mb-1">File Size</p>
                    <p className="text-sm text-gray-600">Up to 100MB (500MB premium)</p>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200">
                    <CheckCircleIcon className="h-6 w-6 text-gray-900 mb-2" />
                    <p className="font-semibold text-gray-900 mb-1">Auto-Delete</p>
                    <p className="text-sm text-gray-600">Videos deleted after analysis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-8 items-start">
            <div className="shrink-0">
              <div className="h-20 w-20 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center shadow-xl">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-all">
                <div className="flex items-center mb-6">
                  <div className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center mr-4">
                    <CpuChipIcon className="h-7 w-7 text-gray-900" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Frame Extraction & Face Detection</h3>
                </div>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  Our system intelligently extracts frames from your video at 1 frame per second and uses 
                  advanced computer vision algorithms to locate, align, and prepare faces for analysis. This 
                  preprocessing step is crucial for accurate detection.
                </p>
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 mb-6 border border-gray-200">
                  <h4 className="font-bold text-xl mb-4 flex items-center text-gray-900">
                    <SparklesIcon className="h-6 w-6 mr-2" />
                    Technical Details
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="h-2 w-2 bg-gray-900 rounded-full mt-2 mr-3 shrink-0"></div>
                      <div>
                        <p className="font-semibold text-gray-900">Dlib's 68-Point Facial Landmark Detection</p>
                        <p className="text-sm text-gray-600">Precisely locates key facial features for alignment</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="h-2 w-2 bg-gray-900 rounded-full mt-2 mr-3 shrink-0"></div>
                      <div>
                        <p className="font-semibold text-gray-900">Intelligent Face Alignment & Normalization</p>
                        <p className="text-sm text-gray-600">Rotates and scales faces to standard position</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="h-2 w-2 bg-gray-900 rounded-full mt-2 mr-3 shrink-0"></div>
                      <div>
                        <p className="font-semibold text-gray-900">Bounding Box Calculation</p>
                        <p className="text-sm text-gray-600">Extracts optimal face regions for analysis</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="h-2 w-2 bg-gray-900 rounded-full mt-2 mr-3 shrink-0"></div>
                      <div>
                        <p className="font-semibold text-gray-900">Quality Assessment & Filtering</p>
                        <p className="text-sm text-gray-600">Ensures only high-quality frames are analyzed</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-600 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <ClockIcon className="h-5 w-5 mr-2 text-gray-900" />
                  <span>Typical processing time: 15-30 seconds for a 30-second video</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-8 items-start">
            <div className="shrink-0">
              <div className="h-20 w-20 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center shadow-xl">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-all">
                <div className="flex items-center mb-6">
                  <div className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center mr-4">
                    <ShieldCheckIcon className="h-7 w-7 text-gray-900" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">AI Ensemble Analysis</h3>
                </div>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  Each frame is analyzed by our ensemble of three state-of-the-art deepfake detection models. 
                  This multi-model approach ensures high accuracy and dramatically reduces false positives by 
                  combining different architectural strengths and training approaches.
                </p>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-5 text-center border border-gray-200 shadow-lg">
                    <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl font-bold text-gray-900">1</span>
                    </div>
                    <p className="font-bold text-lg mb-1 text-gray-900">EfficientNet-B4</p>
                    <p className="text-xs text-gray-600">Efficient feature extraction</p>
                  </div>
                  <div className="bg-white rounded-xl p-5 text-center border border-gray-200 shadow-lg">
                    <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl font-bold text-gray-900">2</span>
                    </div>
                    <p className="font-bold text-lg mb-1 text-gray-900">Xception</p>
                    <p className="text-xs text-gray-600">Deep separable convolutions</p>
                  </div>
                  <div className="bg-white rounded-xl p-5 text-center border border-gray-200 shadow-lg">
                    <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl font-bold text-gray-900">3</span>
                    </div>
                    <p className="font-bold text-lg mb-1 text-gray-900">ResNet-50</p>
                    <p className="text-xs text-gray-600">Residual learning framework</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center text-lg">
                    <CheckCircleIcon className="h-6 w-6 mr-2" />
                    Majority Voting Algorithm
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    The final prediction for each frame is determined by combining outputs from all three models. 
                    If 2 or 3 models agree on "FAKE", the frame is classified as fake. This voting mechanism 
                    improves accuracy by 7-12% compared to single models and provides more robust detection 
                    against adversarial attacks.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-8 items-start">
            <div className="shrink-0">
              <div className="h-20 w-20 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center shadow-xl">
                <span className="text-3xl font-bold text-white">4</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-all">
                <div className="flex items-center mb-6">
                  <div className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center mr-4">
                    <ChartBarIcon className="h-7 w-7 text-gray-900" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Results & Comprehensive Report</h3>
                </div>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  After analyzing all frames, we aggregate the results to provide you with a comprehensive 
                  verdict including confidence scores, detailed statistics, visual timelines, and actionable 
                  insights. All results are presented in an easy-to-understand format.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start bg-gradient-to-br from-green-50 to-white rounded-xl p-5 border border-green-200">
                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center mr-4 mt-1 shrink-0">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg mb-1">Overall Verdict</p>
                      <p className="text-gray-600">
                        Clear FAKE or REAL classification with percentage-based confidence score. 
                        Scores above 80% indicate high confidence.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start bg-gradient-to-br from-blue-50 to-white rounded-xl p-5 border border-blue-200">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4 mt-1 shrink-0">
                      <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg mb-1">Frame-by-Frame Breakdown</p>
                      <p className="text-gray-600">
                        Detailed analysis showing which specific frames were detected as fake or real, 
                        with individual confidence scores for each frame.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start bg-gradient-to-br from-purple-50 to-white rounded-xl p-5 border border-purple-200">
                    <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4 mt-1 shrink-0">
                      <CheckCircleIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg mb-1">Visual Timeline</p>
                      <p className="text-gray-600">
                        Interactive chart displaying confidence levels over time, helping you identify 
                        suspicious segments and patterns in the video.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start bg-gradient-to-br from-orange-50 to-white rounded-xl p-5 border border-orange-200">
                    <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4 mt-1 shrink-0">
                      <CheckCircleIcon className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg mb-1">Downloadable Reports</p>
                      <p className="text-gray-600">
                        Export comprehensive PDF reports with all findings for documentation, 
                        sharing, or further analysis (available for registered users).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why Ensemble Works */}
        <div className="mt-20 bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-xl border border-gray-200 p-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Why Ensemble Learning Works</h2>
          <p className="text-lg text-gray-600 text-center mb-10 max-w-3xl mx-auto leading-relaxed">
            Our three-model ensemble approach provides superior accuracy because each model captures 
            different aspects of deepfake manipulation.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
              <div className="text-4xl font-bold text-gray-900 mb-2">7-12%</div>
              <p className="text-sm text-gray-600 mb-3">Accuracy improvement over single models</p>
              <p className="text-xs text-gray-500">Validated on FaceForensics++ benchmark</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
              <div className="text-4xl font-bold text-gray-900 mb-2">3×</div>
              <p className="text-sm text-gray-600 mb-3">Fewer false positives with voting</p>
              <p className="text-xs text-gray-500">Requires 2/3 models to agree</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
              <div className="text-4xl font-bold text-gray-900 mb-2">99.5%</div>
              <p className="text-sm text-gray-600 mb-3">Detection accuracy achieved</p>
              <p className="text-xs text-gray-500">On multiple benchmark datasets</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 bg-gradient-to-br from-gray-50 to-white rounded-2xl p-10 text-center shadow-2xl border border-gray-200">
          <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheckIcon className="h-8 w-8 text-gray-900" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">Ready to Try It?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Experience our advanced AI detection technology. Start analyzing videos in seconds.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              to="/" 
              className="inline-flex items-center justify-center px-8 py-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Try Free Upload
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              to="/signup" 
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 rounded-xl hover:bg-gray-50 font-semibold transition-all border border-gray-200"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}