import { getStatusIcon } from '../constants/icons';

interface StatusBadgeProps {
  status: string;
  showIcon?: boolean;
  className?: string;
}

/**
 * Reusable status badge component with consistent styling
 * Automatically maps status to appropriate color and icon
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  className = '',
}) => {
  const getStatusClass = (status: string): string => {
    const statusLower = status.toLowerCase();
    
    // Success states
    if (['available', 'active', 'completed', 'approved', 'confirmed', 'paid'].includes(statusLower)) {
      return 'badge-success';
    }
    
    // Warning states
    if (['reserved', 'pending', 'in_progress', 'partial'].includes(statusLower)) {
      return 'badge-warning';
    }
    
    // Error states
    if (['cancelled', 'rejected', 'failed', 'inactive'].includes(statusLower)) {
      return 'badge-error';
    }
    
    // Info states (sold, dispatched, etc)
    if (['sold', 'dispatched', 'shipped', 'draft'].includes(statusLower)) {
      return 'badge-info';
    }
    
    return 'badge-info';
  };

  const statusClass = getStatusClass(status);
  const icon = getStatusIcon(status.toLowerCase());

  return (
    <span className={`badge ${statusClass} ${className}`}>
      {showIcon && <span className="badge-icon">{icon}</span>}
      <span>{status}</span>
    </span>
  );
};

export default StatusBadge;
