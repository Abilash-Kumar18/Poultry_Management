import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Users, ShieldCheck, AlertTriangle, Calendar } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { PageLoader } from '../../components/UI/LoadingSkeleton';
import { ErrorState } from '../../components/UI/EmptyState';
import { ScoreBar } from '../../components/UI/StatCard';
import { getHealthBadge, getSeverityBadge, getStatusBadge, formatDate, formatDateTime } from '../../utils/helpers';

export default function FarmDetail() {
  const { id } = useParams();
  const { data, loading, error } = useFetch(`/farms/${id}`);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;
  if (!data?.farm) return <ErrorState error="Farm not found" />;

  const { farm, recentAlerts, recentVisitors } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/farms" className="btn-ghost py-1.5 px-3 text-sm">
          <ArrowLeft size={16} /> Back
        </Link>
      </div>

      {/* Farm Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-secondary-600 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
              {farm.type === 'pig' ? '🐷' : farm.type === 'poultry' ? '🐔' : '🏡'}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{farm.name}</h1>
                <span className={getHealthBadge(farm.health_status)}>{farm.health_status}</span>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><MapPin size={14} />{farm.location}</span>
                <span className="flex items-center gap-1"><Users size={14} />Capacity: {farm.capacity?.toLocaleString()}</span>
                <span className="flex items-center gap-1"><Calendar size={14} />Since {formatDate(farm.created_at)}</span>
              </div>
              {farm.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{farm.description}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Visitors', value: farm.total_visitors ?? 0, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Pending Visitors', value: farm.pending_visitors ?? 0, color: 'text-yellow-600 dark:text-yellow-400' },
          { label: 'Active Alerts', value: farm.active_alerts ?? 0, color: 'text-red-600 dark:text-red-400' },
          { label: 'Checks Done', value: `${farm.completed_checks ?? 0}/${farm.total_checks ?? 0}`, color: 'text-green-600 dark:text-green-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Biosecurity Score */}
      <div className="card">
        <h2 className="section-title">Biosecurity Score</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-gray-900 dark:text-white">{farm.biosecurity_score}%</span>
            <span className={getHealthBadge(farm.health_status)}>{farm.health_status}</span>
          </div>
          <ScoreBar score={farm.biosecurity_score} showLabel={false} />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {farm.biosecurity_score >= 80 ? '✅ Excellent biosecurity practices maintained.' :
             farm.biosecurity_score >= 60 ? '⚠️ Biosecurity needs improvement. Review pending checklists.' :
             '🚨 Critical biosecurity issues detected. Immediate action required.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Recent Alerts</h2>
            <Link to={`/alerts`} className="text-xs text-primary-500 font-medium hover:text-primary-600">View all →</Link>
          </div>
          {recentAlerts?.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No alerts for this farm.</p>
          ) : (
            <div className="space-y-3">
              {recentAlerts?.map(alert => (
                <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <AlertTriangle size={16} className={`flex-shrink-0 mt-0.5 ${
                    alert.severity === 'critical' ? 'text-red-500' :
                    alert.severity === 'high' ? 'text-orange-500' : 'text-yellow-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(alert.created_at)}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className={getSeverityBadge(alert.severity)}>{alert.severity}</span>
                    <span className={getStatusBadge(alert.status)}>{alert.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Visitors */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Recent Visitors</h2>
            <Link to="/visitors" className="text-xs text-primary-500 font-medium hover:text-primary-600">View all →</Link>
          </div>
          {recentVisitors?.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No visitors logged.</p>
          ) : (
            <div className="space-y-3">
              {recentVisitors?.map(visitor => (
                <div key={visitor.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {visitor.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{visitor.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{visitor.purpose} · {formatDate(visitor.visit_date)}</p>
                  </div>
                  <span className={`badge ${getStatusBadge(visitor.status)}`}>{visitor.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
