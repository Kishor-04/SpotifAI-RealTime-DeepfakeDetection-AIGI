import { Link } from 'react-router-dom'
import PublicNavbar from '../components/PublicNavbar'
import {
  ShieldCheckIcon,
  AcademicCapIcon,
  UserGroupIcon,
  BeakerIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  SparklesIcon,
  ChartBarIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline'

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <PublicNavbar />

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-full mb-6 shadow-lg">
            <SparklesIcon className="h-4 w-4 mr-2" />
            Fighting Misinformation with AI
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">About SpotifAI</h1>
          <p className="text-xl sm:text-2xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Empowering the world to distinguish truth from manipulation through cutting-edge artificial intelligence technology.
          </p>
        </div>
      </div>

      {/* Mission */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-200 p-10 mb-16">
          <div className="flex items-center mb-6">
            <div className="h-12 w-12 bg-gray-900 rounded-xl flex items-center justify-center mr-4">
              <LightBulbIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900">Our Mission</h2>
          </div>
          <p className="text-xl text-gray-600 leading-relaxed mb-6">
            In an era where deepfake technology is becoming increasingly sophisticated and accessible, 
            SpotifAI was created to empower individuals, journalists, and organizations with the tools 
            they need to verify video authenticity. Our mission is to combat misinformation and protect 
            the integrity of digital media through advanced AI-powered detection.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed">
            We believe that everyone deserves access to tools that help them discern reality from manipulation. 
            As deepfakes become more prevalent, our technology evolves to stay ahead of emerging threats, 
            ensuring a safer digital landscape for all.
          </p>
        </div>

        {/* Vision & Values */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="h-16 w-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheckIcon className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Accuracy First</h3>
            <p className="text-gray-600">
              We prioritize precision in our detection, continuously refining our models to minimize false positives and negatives.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="h-16 w-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <GlobeAltIcon className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Universal Access</h3>
            <p className="text-gray-600">
              Everyone should have the power to verify video authenticity, regardless of technical expertise or budget.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="h-16 w-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <BeakerIcon className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Innovation</h3>
            <p className="text-gray-600">
              We stay at the forefront of research, adapting to new deepfake techniques as they emerge.
            </p>
          </div>
        </div>

        {/* Key Features */}
        <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">What Makes Us Different</h2>
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-all">
            <div className="flex items-center mb-4">
              <div className="h-14 w-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mr-4">
                <BeakerIcon className="h-7 w-7 text-gray-900" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Research-Backed Technology</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Our detection models are based on peer-reviewed research and trained on millions of 
              real and synthetic video samples from multiple deepfake generation techniques including 
              face swaps, facial reenactment, and audio-visual synthesis. We collaborate with academic 
              institutions to stay current with the latest advancements.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-all">
            <div className="flex items-center mb-4">
              <div className="h-14 w-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mr-4">
                <AcademicCapIcon className="h-7 w-7 text-gray-900" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Academic Excellence</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Developed by a team of computer vision researchers and AI specialists from top universities 
              with expertise in deep learning, media forensics, and adversarial machine learning. Our team 
              publishes regularly in leading AI conferences and journals.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-all">
            <div className="flex items-center mb-4">
              <div className="h-14 w-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mr-4">
                <ChartBarIcon className="h-7 w-7 text-gray-900" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Industry-Leading Accuracy</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Achieving 99.5% accuracy on benchmark datasets, our ensemble approach combines multiple 
              state-of-the-art models (EfficientNet-B4, Xception, and ResNet-50) for reliable detection. 
              This multi-model voting system dramatically reduces false positives while maintaining high sensitivity.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-all">
            <div className="flex items-center mb-4">
              <div className="h-14 w-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mr-4">
                <GlobeAltIcon className="h-7 w-7 text-gray-900" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Free & Accessible</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              We believe everyone should have access to deepfake detection. Our platform offers 
              free unlimited video analysis, browser extension for real-time verification, and comprehensive 
              reporting tools. No credit card required, no hidden fees.
            </p>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-xl border border-gray-200 p-10 mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">Technology Stack</h2>
          <p className="text-gray-600 text-center mb-10 text-lg max-w-3xl mx-auto">
            Built with cutting-edge technologies and best practices to deliver fast, reliable, and scalable deepfake detection.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h4 className="font-bold text-xl text-gray-900 mb-4 flex items-center">
                <div className="h-8 w-8 bg-gray-900 rounded-lg flex items-center justify-center mr-3">
                  <BeakerIcon className="h-5 w-5 text-white" />
                </div>
                AI/ML
              </h4>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-gray-900 rounded-full mr-3"></div>
                  PyTorch Framework
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-gray-900 rounded-full mr-3"></div>
                  EfficientNet-B4
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-gray-900 rounded-full mr-3"></div>
                  Xception Network
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-gray-900 rounded-full mr-3"></div>
                  ResNet-50
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-gray-900 rounded-full mr-3"></div>
                  Dlib Face Detection
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h4 className="font-bold text-xl text-gray-900 mb-4 flex items-center">
                <div className="h-8 w-8 bg-gray-900 rounded-lg flex items-center justify-center mr-3">
                  <ShieldCheckIcon className="h-5 w-5 text-white" />
                </div>
                Backend
              </h4>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-gray-900 rounded-full mr-3"></div>
                  Python/Flask API
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-gray-900 rounded-full mr-3"></div>
                  PostgreSQL Database
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-gray-900 rounded-full mr-3"></div>
                  Redis Caching
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-gray-900 rounded-full mr-3"></div>
                  JWT Authentication
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-gray-900 rounded-full mr-3"></div>
                  OpenCV Processing
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h4 className="font-bold text-xl text-gray-900 mb-4 flex items-center">
                <div className="h-8 w-8 bg-gray-900 rounded-lg flex items-center justify-center mr-3">
                  <GlobeAltIcon className="h-5 w-5 text-white" />
                </div>
                Frontend
              </h4>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-gray-900 rounded-full mr-3"></div>
                  React.js
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-gray-900 rounded-full mr-3"></div>
                  TailwindCSS
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-gray-900 rounded-full mr-3"></div>
                  Chart.js Analytics
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-gray-900 rounded-full mr-3"></div>
                  Chrome Extension API
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-gray-900 rounded-full mr-3"></div>
                  SSE Streaming
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-10 mb-16">
          <div className="flex items-center mb-6">
            <div className="h-14 w-14 bg-gray-900 rounded-xl flex items-center justify-center mr-4">
              <UserGroupIcon className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900">Our Team</h2>
          </div>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            SpotifAI is developed and maintained by a dedicated team of AI researchers, software engineers, 
            and cybersecurity experts committed to advancing the field of digital media forensics. Our diverse 
            team brings together expertise from machine learning, computer vision, security, and user experience design.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-2">Research & Development</h4>
              <p className="text-gray-600 text-sm">
                PhD-level researchers specializing in deep learning, computer vision, and adversarial AI, 
                continuously improving our detection algorithms.
              </p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-2">Engineering</h4>
              <p className="text-gray-600 text-sm">
                Full-stack engineers building scalable, secure infrastructure to process millions of 
                video frames efficiently.
              </p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-2">Security</h4>
              <p className="text-gray-600 text-sm">
                Cybersecurity experts ensuring your data remains private and our systems stay protected 
                against emerging threats.
              </p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-2">Product & Design</h4>
              <p className="text-gray-600 text-sm">
                UX designers and product managers creating intuitive interfaces that make advanced AI 
                accessible to everyone.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-8 border border-gray-200">
            <div className="flex items-start">
              <div className="text-6xl text-gray-300 mr-4">"</div>
              <div className="flex-1">
                <p className="text-lg italic mb-4 leading-relaxed text-gray-700">
                  As deepfake technology evolves, so does our detection capability. We're constantly updating 
                  our models with the latest research and techniques to stay ahead of emerging threats. Our 
                  commitment is not just to detect today's deepfakes, but to anticipate and defend against 
                  tomorrow's innovations in synthetic media.
                </p>
                <p className="font-semibold text-xl text-gray-900">— The SpotifAI Team</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-12 text-center border border-gray-200 shadow-xl">
          <div className="h-16 w-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <EnvelopeIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Get In Touch</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Have questions, feedback, or want to collaborate? We'd love to hear from you.
          </p>
          <div className="space-y-3 text-gray-600 mb-10">
            <p className="text-lg">
              General Support: <a href="mailto:support@spotifai.com" className="text-gray-900 font-semibold hover:underline">support@spotifai.com</a>
            </p>
            <p className="text-lg">
              Research Inquiries: <a href="mailto:research@spotifai.com" className="text-gray-900 font-semibold hover:underline">research@spotifai.com</a>
            </p>
            <p className="text-lg">
              Media & Press: <a href="mailto:press@spotifai.com" className="text-gray-900 font-semibold hover:underline">press@spotifai.com</a>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/signup" className="inline-block px-8 py-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">
              Join Our Community
            </Link>
            <Link to="/how-it-works" className="inline-block px-8 py-4 bg-white text-gray-900 rounded-xl hover:bg-gray-50 font-semibold transition-all border-2 border-gray-900 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
              Learn How It Works
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}