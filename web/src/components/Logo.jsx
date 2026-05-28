export function LogoMark({ size = 28, animate = false, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        width="32"
        height="32"
        rx="8"
        fill="rgb(255 255 255 / 0.9)"
        style={{ filter: "drop-shadow(0 1px 2px rgb(0 0 0 / 0.06))" }}
      />
      <path
        d="M9 9v10a5 5 0 0 0 5 5h4a5 5 0 0 0 5-5V9"
        stroke="#D97706"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        style={
          animate
            ? {
                strokeDasharray: 60,
                strokeDashoffset: 60,
                animation: "urba-draw 0.9s cubic-bezier(0.22,1,0.36,1) 0.1s forwards",
              }
            : undefined
        }
      />
      <rect
        x="9"
        y="22"
        width="14"
        height="2.5"
        rx="1"
        fill="#D97706"
        style={
          animate
            ? {
                transformOrigin: "9px 23px",
                transform: "scaleX(0)",
                animation: "urba-base 0.4s cubic-bezier(0.22,1,0.36,1) 0.85s forwards",
              }
            : undefined
        }
      />
      <style>{`
        @keyframes urba-draw { to { stroke-dashoffset: 0; } }
        @keyframes urba-base { to { transform: scaleX(1); } }
      `}</style>
    </svg>
  );
}

export function Wordmark({ className = "" }) {
  return (
    <span
      className={`font-sans font-semibold text-text-primary ${className}`}
      style={{ letterSpacing: "-0.04em", fontSize: "17px" }}
    >
      URBA
    </span>
  );
}

export function Lockup({ animate = false, size = 28 }) {
  return (
    <div className="inline-flex items-center gap-2">
      <LogoMark size={size} animate={animate} />
      <Wordmark />
    </div>
  );
}
