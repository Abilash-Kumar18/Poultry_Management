export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      {Icon && (
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
          <Icon size={32} className="text-gray-400 dark:text-gray-500" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      {message && <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">{message}</p>}
      {action && action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4">
        <span className="text-3xl">⚠️</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Something went wrong</h3>
      <p className="text-sm text-red-600 dark:text-red-400 mb-6">{error}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          Try Again
        </button>
      )}
    </div>
  );
}
