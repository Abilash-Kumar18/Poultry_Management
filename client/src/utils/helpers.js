/**
 * Format date to readable string
 */
export const formatDate = (dateStr, options = {}) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', ...options
    });
  } catch { return 'Invalid date'; }
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return 'Invalid date'; }
};

export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  } catch { return 'N/A'; }
};

/**
 * Get badge class for health status
 */
export const getHealthBadge = (status) => {
  const map = {
    healthy: 'badge-green',
    warning: 'badge-yellow',
    critical: 'badge-red',
  };
  return map[status] || 'badge-gray';
};

/**
 * Get badge class for severity
 */
export const getSeverityBadge = (severity) => {
  const map = {
    low: 'badge-blue',
    medium: 'badge-yellow',
    high: 'badge-red',
    critical: 'badge-red',
  };
  return map[severity] || 'badge-gray';
};

/**
 * Get badge class for visitor/checklist status
 */
export const getStatusBadge = (status) => {
  const map = {
    pending: 'badge-yellow',
    approved: 'badge-green',
    rejected: 'badge-red',
    completed: 'badge-blue',
    active: 'badge-red',
    monitoring: 'badge-yellow',
    resolved: 'badge-green',
    skipped: 'badge-gray',
  };
  return map[status] || 'badge-gray';
};

/**
 * Get color for biosecurity score
 */
export const getScoreColor = (score) => {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

export const getScoreBarColor = (score) => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
};

/**
 * Format farm type
 */
export const formatFarmType = (type) => {
  const map = { pig: '🐷 Pig', poultry: '🐔 Poultry', mixed: '🏡 Mixed' };
  return map[type] || type;
};

/**
 * Truncate text
 */
export const truncate = (text, maxLen = 50) => {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
};
