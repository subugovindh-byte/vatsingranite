import { useRefresh } from '../hooks/useRefresh';
import { Icons } from '../constants/icons';

interface RefreshButtonProps {
  queryKeys?: string[][];
  label?: string;
  showLabel?: boolean;
  className?: string;
}

/**
 * Reusable refresh button component
 * Can be used on any page to refresh data
 */
export const RefreshButton: React.FC<RefreshButtonProps> = ({
  queryKeys,
  label = 'Refresh',
  showLabel = true,
  className = 'btn btn-secondary btn-sm',
}) => {
  const { refresh, isRefreshing } = useRefresh(queryKeys);

  return (
    <button
      onClick={refresh}
      disabled={isRefreshing}
      className={className}
      title={label}
    >
      <span
        className={isRefreshing ? 'spinner' : ''}
        style={{
          display: 'inline-block',
          transition: 'transform 0.3s ease',
          transform: isRefreshing ? 'rotate(360deg)' : 'rotate(0deg)',
        }}
      >
        {!isRefreshing && Icons.refresh}
      </span>
      {showLabel && <span>{isRefreshing ? 'Refreshing...' : label}</span>}
    </button>
  );
};

export default RefreshButton;
