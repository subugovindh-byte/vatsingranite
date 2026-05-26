import { ReactNode } from 'react';

import RefreshButton from './RefreshButton';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  actions?: ReactNode;
  showRefresh?: boolean;
  refreshQueryKeys?: string[][];
}

/**
 * Reusable page header component with consistent styling
 * Includes optional refresh button and action buttons
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  showRefresh = false,
  refreshQueryKeys,
}) => {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">
          {icon && <span style={{ fontSize: '2rem', marginRight: '0.5rem' }}>{icon}</span>}
          {title}
        </h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      <div className="page-actions">
        {showRefresh && (
          <RefreshButton
            queryKeys={refreshQueryKeys}
            showLabel={false}
          />
        )}
        {actions}
      </div>
    </div>
  );
};

export default PageHeader;
