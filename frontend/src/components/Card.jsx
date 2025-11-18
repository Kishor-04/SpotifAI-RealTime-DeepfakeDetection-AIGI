const Card = ({ 
  children, 
  className = '', 
  hover = false,
  padding = true,
  bordered = true,
  shadow = 'sm',
  ...props 
}) => {
  const paddingClass = padding ? 'p-6' : 'p-0'
  const borderClass = bordered ? 'border border-zinc-200' : ''
  const shadowClass = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  }[shadow]
  
  const hoverClass = hover ? 'hover:shadow-xl hover:-translate-y-1 hover:border-zinc-300 cursor-pointer' : ''
  
  return (
    <div 
      className={`
        bg-white rounded-xl 
        ${paddingClass} 
        ${borderClass} 
        ${shadowClass}
        ${hoverClass}
        transition-all duration-300
        ${className}
      `} 
      {...props}
    >
      {children}
    </div>
  )
}

export const StatCard = ({ 
  icon: Icon, 
  title, 
  value, 
  subtitle, 
  trend,
  trendValue,
  gradient = 'from-zinc-800 to-zinc-900',
  iconBg = 'bg-gradient-to-br from-zinc-800 to-zinc-900'
}) => (
  <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-zinc-300">
    {/* Subtle gradient overlay on hover */}
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.02] transition-opacity duration-300`}></div>
    
    <div className="relative">
      {/* Header with icon */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">{title}</p>
        </div>
        {Icon && (
          <div className={`h-12 w-12 ${iconBg} rounded-xl flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        )}
      </div>
      
      {/* Main value */}
      <div className="mb-2">
        <p className="text-4xl font-bold text-zinc-900 tracking-tight">{value}</p>
      </div>
      
      {/* Subtitle and trend */}
      <div className="flex items-center gap-3">
        {subtitle && (
          <p className="text-sm text-zinc-600">{subtitle}</p>
        )}
        {trend && trendValue && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
            trend === 'up' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : trend === 'down'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-zinc-50 text-zinc-700 border border-zinc-200'
          }`}>
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {trendValue}
          </span>
        )}
      </div>
    </div>
  </div>
)

export const InfoCard = ({ title, description, icon: Icon, actionText, onAction }) => (
  <div className="bg-white rounded-xl p-6 border border-zinc-200 shadow-sm hover:shadow-md transition-all duration-300 hover:border-zinc-300">
    <div className="flex items-start gap-4">
      {Icon && (
        <div className="flex-shrink-0 h-10 w-10 bg-zinc-100 rounded-lg flex items-center justify-center">
          <Icon className="h-5 w-5 text-zinc-700" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-bold text-zinc-900 mb-2">{title}</h3>
        <p className="text-sm text-zinc-600 leading-relaxed mb-4">{description}</p>
        {actionText && onAction && (
          <button 
            onClick={onAction}
            className="text-sm font-semibold text-zinc-900 hover:text-zinc-700 inline-flex items-center gap-1 group transition-colors"
          >
            {actionText}
            <span className="transform group-hover:translate-x-1 transition-transform">→</span>
          </button>
        )}
      </div>
    </div>
  </div>
)

export default Card