import { useState } from 'react'
import { Link } from 'react-router-dom'
import PublicNavbar from '../components/PublicNavbar'
import {
  ShieldCheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const faqs = [
    {
      category: 'General',
      icon: QuestionMarkCircleIcon,
      questions: [
        {
          q: 'What is SpotifAI?',
          a: 'SpotifAI is an AI-powered deepfake detection platform that analyzes videos to determine if they contain manipulated or synthetic content. We use an ensemble of three state-of-the-art deep learning models (EfficientNet-B4, Xception, and ResNet-50) to provide accurate and reliable detection. Our platform is designed to be accessible to everyone, from individual users to journalists and organizations.'
        },
        {
          q: 'How accurate is the detection?',
          a: 'Our ensemble detection system achieves 99.5% accuracy on benchmark datasets like FaceForensics++ and Celeb-DF. However, accuracy may vary depending on video quality, deepfake generation technique, compression artifacts, and lighting conditions. We provide a confidence score with each detection to help you interpret the results. Videos with confidence scores below 60% should be manually reviewed.'
        },
        {
          q: 'What video formats are supported?',
          a: 'We support all major video formats including MP4, AVI, MOV, WebM, MKV, and FLV. Maximum file size is 100MB for free users and 500MB for premium users. We recommend using high-quality, uncompressed videos for best results, as heavy compression can reduce detection accuracy.'
        },
        {
          q: 'Is my data private and secure?',
          a: 'Yes, absolutely. All uploads are encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. For free uploads, videos are analyzed and immediately deleted without being stored in our database. Registered users can choose to save their analysis results for future reference, but the original video files are always permanently deleted after processing. We never share your data with third parties and comply with GDPR and CCPA regulations.'
        },
        {
          q: 'How much does it cost?',
          a: 'SpotifAI offers a completely free tier with unlimited video analysis up to 100MB per video. We believe everyone should have access to deepfake detection tools. Premium features (coming soon) will include larger file sizes (500MB), batch processing, API access, priority processing, and advanced analytics, but the core detection features will always remain free.'
        }
      ]
    },
    {
      category: 'Detection Process',
      icon: MagnifyingGlassIcon,
      questions: [
        {
          q: 'How long does analysis take?',
          a: 'Analysis time depends on video length, resolution, and quality. Typically, a 30-second HD video takes 15-30 seconds to process, while longer videos may take 1-2 minutes. Our system extracts frames at 1 FPS (one frame per second), detects faces, and runs them through our three AI models. You can monitor real-time progress with our frame-by-frame tracker that shows exactly which frame is being analyzed.'
        },
        {
          q: 'Why does the detector sometimes say "NO_FACES"?',
          a: 'The "NO_FACES" verdict means our face detection algorithm (using Dlib\'s 68-point facial landmark detection) could not locate any faces in the video frames. This can happen if: faces are too small (below 80x80 pixels), heavily occluded by objects or hands, at extreme angles (>45 degrees), poorly lit, or if the video does not contain any human faces. Try re-uploading with better lighting, larger faces, or more frontal camera angles.'
        },
        {
          q: 'What is ensemble voting?',
          a: 'We use three different AI models (EfficientNet-B4, Xception, and ResNet-50) to analyze each frame independently. Each model was trained on different datasets and architectures, making them sensitive to different types of manipulation. The final prediction for each frame is determined by majority voting among these models—if 2 or 3 models agree, that becomes the verdict. This ensemble approach improves accuracy by 7-12% compared to single models and dramatically reduces false positives.'
        },
        {
          q: 'Can it detect all types of deepfakes?',
          a: 'Our models are trained on a wide variety of deepfake generation techniques including face swaps (FaceSwap, DeepFaceLab), facial reenactment (Face2Face, NeuralTextures), audio-visual synthesis, and GAN-based methods. However, as deepfake technology evolves, new techniques may emerge that our models haven\'t seen before. We continuously update our models with the latest research and retrain on new datasets monthly to adapt to emerging manipulation methods.'
        },
        {
          q: 'What does the confidence score mean?',
          a: 'The confidence score represents how certain our models are about their prediction. Scores above 80% indicate high confidence, 60-80% moderate confidence, and below 60% low confidence. Low confidence can occur with borderline cases, high-quality deepfakes, or degraded video quality. We recommend treating low-confidence results (below 60%) as "uncertain" and conducting additional verification or manual review.'
        }
      ]
    },
    {
      category: 'Account & Billing',
      icon: ShieldCheckIcon,
      questions: [
        {
          q: 'Do I need an account to use SpotifAI?',
          a: 'No! You can try our service with unlimited free video uploads on the homepage without creating an account. However, creating a free account unlocks additional features like: permanent analysis history, ability to re-analyze videos, browser extension access with API token, session management, downloadable reports, and detailed frame-by-frame analytics. Account creation takes less than 30 seconds.'
        },
        {
          q: 'What are the differences between free and premium accounts?',
          a: 'Free accounts can analyze unlimited videos up to 100MB each, with all core detection features including ensemble voting, confidence scores, and frame analysis. Premium accounts (coming soon) will offer: larger file sizes up to 500MB, batch processing of multiple videos, REST API access with higher rate limits, priority processing (faster queue), advanced analytics and visualizations, white-label reports, and webhook notifications for automated workflows.'
        },
        {
          q: 'Can I delete my account?',
          a: 'Yes, absolutely. You can delete your account at any time from the Settings page under the "Danger Zone" tab. This will permanently remove all your data including analysis history, saved sessions, API tokens, and account information. This action cannot be undone. We comply with GDPR "right to be forgotten" and will delete all traces of your data within 30 days.'
        },
        {
          q: 'How do I get an API token for the browser extension?',
          a: 'After logging in, go to Settings → Extension tab to generate your personal API token. Copy this token and paste it into the browser extension popup settings. The token links the extension to your account for seamless video analysis. You can regenerate tokens at any time if compromised. Each token is encrypted and tied to your specific account for security.'
        },
        {
          q: 'Can I use SpotifAI for commercial purposes?',
          a: 'Yes! Our free tier can be used for commercial purposes with attribution. If you\'re a business needing high-volume processing, API access, or white-label solutions, please contact our sales team at business@spotifai.com. We offer custom enterprise plans with SLAs, dedicated support, and advanced features tailored to your organization\'s needs.'
        }
      ]
    },
    {
      category: 'Browser Extension',
      icon: ShieldCheckIcon,
      questions: [
        {
          q: 'How does the browser extension work?',
          a: 'The SpotifAI Chrome extension adds a floating badge to video pages (like YouTube or Twitter). When you play a video, it automatically: detects the video element on the page, downloads the video in the background, sends it to our API for analysis, and displays the verdict (FAKE/REAL) with confidence score directly on the page in real-time. The analysis happens without interrupting playback or requiring you to leave the page.'
        },
        {
          q: 'Which websites does the extension work on?',
          a: 'Currently, the extension works on most video streaming platforms including YouTube, Vimeo, Dailymotion, Twitter/X, Facebook, Instagram, Reddit, and any site with HTML5 video players. We continuously add support for more platforms based on user requests. Some sites with heavy DRM protection or streaming-only content may not be supported. Let us know which platforms you\'d like to see added!'
        },
        {
          q: 'Does the extension slow down my browsing?',
          a: 'No. The extension is extremely lightweight (<500KB) and only activates when it detects a video element on the page. Analysis happens in the background using web workers and does not interfere with video playback, page scrolling, or browser performance. The extension uses less than 50MB of RAM and has minimal CPU usage. You can disable it on specific sites if needed.'
        },
        {
          q: 'How do I install the extension?',
          a: 'Download the extension from the Chrome Web Store (link in Settings → Extension tab). After installation: 1) Click the extension icon in your browser toolbar, 2) Log in or create an account, 3) Generate an API token from your account settings, 4) Paste the token into the extension popup, 5) Start browsing! The extension will automatically detect and analyze videos on supported sites. Works on Chrome, Edge, Brave, and other Chromium-based browsers.'
        },
        {
          q: 'Is the extension safe and private?',
          a: 'Yes. The extension only requests permissions necessary for video detection and analysis. It does not track your browsing history, collect personal data, or access other tabs. Video data is sent securely over HTTPS to our servers and immediately deleted after analysis. The extension is open-source and you can review the code on our GitHub repository. We undergo regular security audits.'
        }
      ]
    },
    {
      category: 'Troubleshooting',
      icon: QuestionMarkCircleIcon,
      questions: [
        {
          q: 'Why is my video analysis failing?',
          a: 'Common reasons include: unsupported video format (use MP4, AVI, MOV), file size exceeds limit (100MB for free), corrupted video file (try re-downloading), extremely low quality or resolution (minimum 240p), or DRM-protected content. Ensure your video is in a supported format, under the size limit, and not corrupted. Try playing the video in VLC player first to verify it works. If issues persist, contact support with the error message.'
        },
        {
          q: 'The confidence score seems low. What does this mean?',
          a: 'A low confidence score (below 60%) means the models are uncertain about the verdict. This can happen with: high-quality deepfakes that are hard to detect, poor video quality or heavy compression, unusual lighting or camera angles, partial face occlusions, or edge cases the models haven\'t seen before. We recommend manually reviewing videos with low confidence scores and looking for other signs of manipulation like: unnatural facial movements, inconsistent lighting on the face, edge artifacts around the face, or lip-sync issues.'
        },
        {
          q: 'Can I re-analyze a video?',
          a: 'Yes. Registered users can re-analyze any previously uploaded video from their session history by clicking the "Re-analyze" button. This is useful if: our models have been updated since your last analysis, you want to see if results change, or you\'re comparing different versions of the same video. Free uploads (without account) cannot be re-analyzed as they are not stored in our database for privacy reasons.'
        },
        {
          q: 'I forgot my password. How do I reset it?',
          a: 'Click "Forgot Password?" on the login page and enter your email. You will receive a password reset link within 5 minutes (check spam folder). If you signed up with Google OAuth, you can only log in using Google—there is no password to reset. For security, password reset links expire after 1 hour. If you don\'t receive the email, contact support@spotifai.com with your registered email address.'
        },
        {
          q: 'Why are my results different from other deepfake detectors?',
          a: 'Different deepfake detection tools use different AI models, training datasets, and detection algorithms. Our ensemble approach with three models may catch deepfakes that single-model detectors miss, or vice versa. No detector is 100% perfect. We recommend using multiple tools when high-stakes verification is needed. Our models are specifically trained on face-swap and facial reenactment deepfakes, which are the most common types, but may struggle with novel generation methods.'
        },
        {
          q: 'The browser extension isn\'t detecting videos. What should I do?',
          a: 'Try these troubleshooting steps: 1) Refresh the page and play the video again, 2) Make sure the extension is enabled (check browser toolbar), 3) Verify your API token is correct in extension settings, 4) Check if the website is supported (see supported sites list), 5) Disable other extensions that might conflict, 6) Clear browser cache and cookies, 7) Update the extension to the latest version. If none of these work, report the issue on our support page with the website URL.'
        }
      ]
    }
  ]

  const toggleFAQ = (categoryIndex, questionIndex) => {
    const index = `${categoryIndex}-${questionIndex}`
    setOpenIndex(openIndex === index ? null : index)
  }

  // Filter FAQs based on search
  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(faq =>
      searchTerm === '' ||
      faq.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0)

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <PublicNavbar />

      {/* Hero */}
      <div className="relative bg-gradient-to-b from-gray-50 to-white py-16 sm:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-full mb-6">
            <QuestionMarkCircleIcon className="h-4 w-4 mr-2" />
            Your Questions Answered
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">Frequently Asked Questions</h1>
          <p className="text-xl sm:text-2xl text-gray-600 leading-relaxed">
            Find answers to common questions about SpotifAI and deepfake detection
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8  mb-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-2">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 text-lg text-gray-900 placeholder-gray-400 focus:outline-none rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-20">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-16">
            <QuestionMarkCircleIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-600">No results found for "{searchTerm}"</p>
            <p className="text-gray-500 mt-2">Try different keywords or browse all categories</p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-6 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-semibold transition-all"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {filteredFaqs.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-gray-900 rounded-lg flex items-center justify-center mr-3">
                    <category.icon className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">{category.category}</h2>
                </div>
                <div className="space-y-4">
                  {category.questions.map((faq, questionIndex) => {
                    const index = `${categoryIndex}-${questionIndex}`
                    const isOpen = openIndex === index

                    return (
                      <div
                        key={questionIndex}
                        className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all"
                      >
                        <button
                          onClick={() => toggleFAQ(categoryIndex, questionIndex)}
                          className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-semibold text-lg text-gray-900 pr-4">{faq.q}</span>
                          <div className="shrink-0">
                            {isOpen ? (
                              <ChevronUpIcon className="h-6 w-6 text-gray-900" />
                            ) : (
                              <ChevronDownIcon className="h-6 w-6 text-gray-600" />
                            )}
                          </div>
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-6 text-gray-600 border-t border-gray-100">
                            <p className="pt-4 leading-relaxed text-base">{faq.a}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <Link
            to="/how-it-works"
            className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-all text-center group"
          >
            <div className="h-12 w-12 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheckIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">How It Works</h3>
            <p className="text-sm text-gray-600">Learn about our detection process</p>
          </Link>

          <Link
            to="/about"
            className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-all text-center group"
          >
            <div className="h-12 w-12 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <QuestionMarkCircleIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">About Us</h3>
            <p className="text-sm text-gray-600">Meet the team behind SpotifAI</p>
          </Link>

          <a
            href="mailto:support@spotifai.com"
            className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-all text-center group"
          >
            <div className="h-12 w-12 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <MagnifyingGlassIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Contact Support</h3>
            <p className="text-sm text-gray-600">Still have questions? Reach out</p>
          </a>
        </div>

        {/* Still Have Questions */}
        <div className="mt-16 bg-gradient-to-br from-gray-50 to-white rounded-2xl p-10 text-center shadow-2xl border border-gray-200">
          <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <QuestionMarkCircleIcon className="h-8 w-8 text-gray-900" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">Still Have Questions?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Can't find what you're looking for? Our support team is here to help you 24/7.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="mailto:support@spotifai.com"
              className="px-8 py-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Email Support
            </a>
            <Link
              to="/about"
              className="px-8 py-4 bg-white text-gray-900 rounded-xl hover:bg-gray-50 font-semibold transition-all border border-gray-200"
            >
              Learn More About Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}