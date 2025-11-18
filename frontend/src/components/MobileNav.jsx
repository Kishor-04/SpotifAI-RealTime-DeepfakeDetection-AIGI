import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Bars3Icon, 
  XMarkIcon,
  HomeIcon,
  CloudArrowUpIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'

export default function MobileNav({ onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
    { name: 'Upload Video', path: '/upload', icon: CloudArrowUpIcon },
    { name: 'Analytics', path: '/analytics', icon: ChartBarIcon },
    { name: 'Settings', path: '/settings', icon: Cog6ToothIcon },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="lg:hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="p-2 rounded-lg hover:bg-zinc-100 active:bg-zinc-200 transition-all duration-200"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <XMarkIcon className="h-6 w-6 text-zinc-900" />
        ) : (
          <Bars3Icon className="h-6 w-6 text-zinc-900" />
        )}
      </button>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="absolute left-0 right-0 top-16 mx-4 py-4 space-y-2 border border-zinc-200 bg-white rounded-xl shadow-lg z-50">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 mx-2 rounded-lg font-semibold 
                  transition-all duration-200
                  ${isActive(item.path)
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200'
                  }
                `}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            )
          })}
          
          <div className="mx-2 mt-2 pt-2 border-t border-zinc-200">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false)
                onLogout()
              }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 active:bg-red-100 transition-all duration-200 font-semibold"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}