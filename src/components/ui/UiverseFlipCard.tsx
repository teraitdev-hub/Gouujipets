import React from 'react';

interface UiverseFlipCardProps {
  defaultTitle: string;
  defaultIcon?: React.ReactNode;
  hoverImage?: string;
  hoverBadge?: string;
  hoverTitle: string;
  hoverSubtitle?: React.ReactNode;
  hoverIcon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const UiverseFlipCard: React.FC<UiverseFlipCardProps> = ({
  defaultTitle,
  defaultIcon,
  hoverImage,
  hoverBadge,
  hoverTitle,
  hoverSubtitle,
  hoverIcon,
  onClick,
  className = ''
}) => {
  return (
    <div 
      className={`flip-card ${className}`} 
      onClick={onClick} 
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="flip-content">
        <div className="flip-back">
          <div className="flip-back-content">
            {defaultIcon}
            <strong className="text-xl font-bold tracking-wider text-center px-4">{defaultTitle}</strong>
          </div>
        </div>
        <div className="flip-front">
          <div className="img">
            <div className="flip-circle"></div>
            <div className="flip-circle" id="flip-right"></div>
            <div className="flip-circle" id="flip-bottom"></div>
            {hoverImage && (
              <div 
                className="absolute inset-0 bg-cover bg-center z-10 opacity-50 mix-blend-overlay"
                style={{ backgroundImage: `url(${hoverImage})` }}
              />
            )}
            <div className="absolute inset-0 bg-slate-900/40 z-0" />
          </div>

          <div className="flip-front-content z-20">
            {hoverBadge ? (
              <small className="badge">{hoverBadge}</small>
            ) : <div />}
            
            <div className="flip-description">
              <div className="flip-title">
                <p className="flip-title font-bold text-white mb-0">
                  <strong>{hoverTitle}</strong>
                </p>
                {hoverIcon}
              </div>
              {hoverSubtitle && (
                <div className="flip-card-footer mt-1">
                  {hoverSubtitle}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
