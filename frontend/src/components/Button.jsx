const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  icon: Icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  ...props 
}) => {
  const variants = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950 shadow-sm hover:shadow-md',
    secondary: 'bg-white text-zinc-900 border-2 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 active:bg-zinc-100 shadow-sm',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm hover:shadow-md',
    ghost: 'text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200',
    outline: 'bg-transparent text-zinc-900 border-2 border-zinc-900 hover:bg-zinc-900 hover:text-white active:bg-zinc-800',
  }

  const sizes = {
    sm: 'text-sm px-4 py-2 rounded-lg',
    md: 'text-base px-6 py-2.5 rounded-lg',
    lg: 'text-lg px-8 py-3 rounded-xl',
    xl: 'text-xl px-10 py-4 rounded-xl',
  }

  const isDisabled = disabled || loading

  return (
    <button
      className={`
        ${variants[variant]} 
        ${sizes[size]} 
        ${fullWidth ? 'w-full' : ''}
        ${className} 
        inline-flex items-center justify-center gap-2.5 
        font-semibold
        transition-all duration-200 
        focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2
        ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'transform hover:scale-[1.02] active:scale-[0.98]'}
      `}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="h-5 w-5" />}
          {children}
        </>
      )}
    </button>
  )
}

export default Button