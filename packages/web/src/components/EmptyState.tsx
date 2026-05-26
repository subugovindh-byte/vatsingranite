import { ReactNode } from 'react';
import { Icons } from '../constants/icons';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Reusable empty state component
 * Shows when no data is available
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = Icons.info,
  title,
  description,
  action,
}) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
