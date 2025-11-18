import { Link } from 'react-router-dom'
import { HomeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        {/* Animated Icon */}
        <div className="mb-8 relative">
          <ExclamationTriangleIcon className="h-24 w-24 text-zinc-400 mx-auto animate-pulse" />
        </div>

        {/* 404 Text */}
        <h1 className="text-9xl font-extrabold text-zinc-900 mb-4 animate-fade-in">
          404
        </h1>
        
        {/* Message */}
        <h2 className="text-3xl font-bold text-zinc-900 mb-3">
          Page Not Found
        </h2>
        <p className="text-lg text-zinc-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl text-white bg-zinc-900 hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <HomeIcon className="h-5 w-5 mr-2" />
            Go Home
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 border-2 border-zinc-300 text-base font-semibold rounded-xl text-zinc-900 bg-white hover:bg-zinc-50 transition-all"
          >
            Dashboard
          </Link>
        </div>

        {/* Additional Help */}
        <p className="mt-8 text-sm text-zinc-500">
          Need help? <Link to="/faq" className="underline hover:text-zinc-900 transition-colors">Visit our FAQ</Link>
        </p>
      </div>
    </div>
  )
}
