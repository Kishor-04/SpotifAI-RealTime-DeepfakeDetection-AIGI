import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ShieldCheckIcon, Bars3Icon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline'

export default function PublicNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'About', path: '/about' },
    { name: 'FAQ', path: '/faq' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-white/90 backdrop-blur-md shadow-sm border-b border-zinc-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 bg-zinc-900 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
              <ShieldCheckIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">
              Spotif<span className="text-zinc-600">AI</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-semibold 
                    transition-all duration-200
                    ${isActive(link.path)
                      ? 'text-zinc-900 bg-zinc-100'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                    }
                  `}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 active:bg-zinc-950 transition-all duration-200 font-semibold shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
            >
              <SparklesIcon className="h-4 w-4" />
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
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
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-zinc-200 bg-white rounded-b-xl shadow-lg">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  block px-4 py-3 rounded-lg font-semibold 
                  transition-all duration-200
                  ${isActive(link.path)
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200'
                  }
                `}
              >
                {link.name}
              </Link>
            ))}
            <Link
              to="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 mx-2 mt-4 px-4 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 active:bg-zinc-950 transition-all duration-200 font-semibold shadow-sm"
            >
              <SparklesIcon className="h-4 w-4" />
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}