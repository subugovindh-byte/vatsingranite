

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  onClick?: () => void;
}

/**
 * Reusable statistics card component
 * Used in dashboards and overview pages
 */
export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  trend,
  onClick,
}) => {
  return (
    <div
      className={`stat-card ${onClick ? 'stat-card-clickable' : ''}`}
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}
    >
      <div style={{ fontSize: '3rem', lineHeight: '1' }}>{icon}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
        <div style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>{label}</div>
        <div style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{value}</div>
        {trend && (
          <div className={`stat-trend ${trend.isPositive ? 'trend-positive' : 'trend-negative'}`}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
