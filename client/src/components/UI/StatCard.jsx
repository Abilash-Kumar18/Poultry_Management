export function StatCard({ icon: Icon, label, value, sublabel, color = 'primary', trend }) {
  const colorMap = {
    primary: { bg: 'bg-primary-50 dark:bg-primary-900/20', icon: 'text-primary-600 dark:text-primary-400', border: 'border-primary-100 dark:border-primary-900/30' },
    secondary: { bg: 'bg-secondary-50 dark:bg-secondary-900/20', icon: 'text-secondary-600 dark:text-secondary-400', border: 'border-secondary-100 dark:border-secondary-900/30' },
    red: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-600 dark:text-red-400', border: 'border-red-100 dark:border-red-900/30' },
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', icon: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-100 dark:border-yellow-900/30' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-900/30' },
  };
  const colors = colorMap[color] || colorMap.primary;

  return (
    <div className={`card border ${colors.border} animate-slide-up`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value ?? '—'}</p>
          {sublabel && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sublabel}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              <span>{trend >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend)}% from last month</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon size={22} className={colors.icon} />
        </div>
      </div>
    </div>
  );
}

export function ScoreBar({ score, label, showLabel = true }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div>
      {showLabel && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600 dark:text-gray-400">{label}</span>
          <span className="font-semibold">{score}%</span>
        </div>
      )}
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
