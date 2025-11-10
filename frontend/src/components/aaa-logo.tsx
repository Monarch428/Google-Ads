export function AAALogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      
      {/* Background Circle */}
      <circle cx="50" cy="50" r="48" fill="url(#logoGradient)" />
      
      {/* AI Symbol - Neural Network Style */}
      <g transform="translate(30, 30)">
        {/* Central Node */}
        <circle cx="20" cy="20" r="4" fill="white" />
        
        {/* Outer Nodes */}
        <circle cx="5" cy="8" r="2.5" fill="white" opacity="0.9" />
        <circle cx="35" cy="8" r="2.5" fill="white" opacity="0.9" />
        <circle cx="5" cy="32" r="2.5" fill="white" opacity="0.9" />
        <circle cx="35" cy="32" r="2.5" fill="white" opacity="0.9" />
        
        {/* Connection Lines */}
        <line x1="20" y1="20" x2="5" y2="8" stroke="white" strokeWidth="1.5" opacity="0.6" />
        <line x1="20" y1="20" x2="35" y2="8" stroke="white" strokeWidth="1.5" opacity="0.6" />
        <line x1="20" y1="20" x2="5" y2="32" stroke="white" strokeWidth="1.5" opacity="0.6" />
        <line x1="20" y1="20" x2="35" y2="32" stroke="white" strokeWidth="1.5" opacity="0.6" />
        
        {/* Horizontal connections */}
        <line x1="5" y1="8" x2="35" y2="8" stroke="white" strokeWidth="1" opacity="0.4" />
        <line x1="5" y1="32" x2="35" y2="32" stroke="white" strokeWidth="1" opacity="0.4" />
      </g>
      
      {/* Accent Dots */}
      <circle cx="85" cy="25" r="3" fill="white" opacity="0.8" />
      <circle cx="15" cy="75" r="3" fill="white" opacity="0.8" />
    </svg>
  );
}
