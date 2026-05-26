

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

/**
 * Reusable loading spinner component
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'md',
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: 'spinner',
    md: 'spinner',
    lg: 'spinner',
  };

  const containerClass = fullScreen
    ? 'loading-container-fullscreen'
    : 'loading-container';

  return (
    <div className={containerClass}>
      <div className={sizeClasses[size]}></div>
      {message && (
        <p style={{ marginTop: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
