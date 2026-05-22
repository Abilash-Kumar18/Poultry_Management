export function LoadingSkeleton({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-4 rounded" style={{ width: `${85 - i * 10}%` }} />
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3">
          <div className="flex items-center gap-3">
            <div className="skeleton w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 rounded w-2/3" />
              <div className="skeleton h-5 rounded w-1/3" />
            </div>
          </div>
          <div className="skeleton h-1 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="table-container">
      <table className="table">
        <thead className="table-header">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="table-th">
                <div className="skeleton h-3 rounded w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="table-row">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="table-td">
                  <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
