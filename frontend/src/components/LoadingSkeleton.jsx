const LoadingSkeleton = ({ className = '', variant = 'default' }) => {
  const variants = {
    default: 'h-4 w-full',
    card: 'h-48 w-full rounded-xl',
    circle: 'h-12 w-12 rounded-full',
    text: 'h-3 w-3/4',
    title: 'h-6 w-1/2',
    stat: 'h-32 w-full rounded-xl',
  }

  return (
    <div
      className={`skeleton ${variants[variant]} ${className}`}
      aria-label="Loading..."
    />
  )
}

export const DashboardSkeleton = () => (
  <div className="space-y-6 animate-fade-in">
    {/* Welcome Card */}
    <LoadingSkeleton variant="card" className="h-40" />
    
    {/* Stats Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <LoadingSkeleton key={i} variant="stat" />
      ))}
    </div>
    
    {/* Charts Row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <LoadingSkeleton variant="card" className="h-80" />
      <LoadingSkeleton variant="card" className="h-80" />
    </div>
    
    {/* Recent Sessions */}
    <div className="space-y-4">
      <LoadingSkeleton variant="title" />
      {[1, 2, 3].map(i => (
        <LoadingSkeleton key={i} variant="card" className="h-24" />
      ))}
    </div>
  </div>
)

export const AnalyticsSkeleton = () => (
  <div className="space-y-4 animate-fade-in">
    {[1, 2, 3, 4, 5].map(i => (
      <LoadingSkeleton key={i} variant="card" className="h-32" />
    ))}
  </div>
)

export default LoadingSkeleton
