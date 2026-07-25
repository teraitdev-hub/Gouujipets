import React from 'react';

interface UiverseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  text: React.ReactNode;
  color?: string; // CSS color string, e.g. '#4F46E5'
  className?: string;
}

export const UiverseButton: React.FC<UiverseButtonProps> = ({
  icon,
  text,
  color = '#4F46E5',
  className = '',
  style,
  ...props
}) => {
  return (
    <button
      className={`button ${className}`}
      style={{ ...style, '--clr': color } as React.CSSProperties}
      {...props}
    >
      <span className="button-decor"></span>
      <div className="button-content">
        <div className="button__icon">
          {icon || (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: '20px', height: '20px' }}
            >
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          )}
        </div>
        <span className="button__text">{text}</span>
      </div>
    </button>
  );
};
