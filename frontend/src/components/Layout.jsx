import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MobileNav from './MobileNav'
import {
  HomeIcon,
  CloudArrowUpIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Upload Video', href: '/upload', icon: CloudArrowUpIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50">
      {/* Top Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              {/* Mobile Menu */}
              <MobileNav onLogout={logout} />
              
              {/* Logo */}
              <Link to="/dashboard" className="flex items-center gap-2.5 group">
                <div className="h-9 w-9 bg-zinc-900 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
                  <ShieldCheckIcon className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                  Spotif<span className="text-zinc-600">AI</span>
                </h1>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex lg:items-center lg:gap-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      inline-flex items-center gap-2 px-4 py-2 rounded-lg
                      text-sm font-semibold transition-all duration-200
                      ${isActive
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                      }
                    `}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>

            {/* User Info & Logout (Desktop) */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-200">
                <UserCircleIcon className="h-5 w-5 text-zinc-600" />
                <span className="text-sm font-medium text-zinc-700 max-w-[150px] truncate">
                  {user?.email}
                </span>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-zinc-600 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all duration-200"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-zinc-600">
              © 2024 SpotifAI. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}