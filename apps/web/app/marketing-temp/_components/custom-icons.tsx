interface CustomIconProps {
  className?: string
}

export function CustomSmartphoneIcon({ className = "h-6 w-6" }: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Phone body */}
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" fill="#2d5a3d" stroke="#2d5a3d" />
      {/* Screen */}
      <rect x="7" y="4" width="10" height="12" rx="1" fill="#e9c351" stroke="none" />
      {/* Home button */}
      <circle cx="12" cy="19" r="1" fill="#e9c351" stroke="none" />
    </svg>
  )
}

export function CustomGlobeIcon({ className = "h-6 w-6" }: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Globe circle background */}
      <circle cx="12" cy="12" r="10" fill="#2d5a3d" stroke="#2d5a3d" />
      {/* Simplified continent shapes in yellow */}
      <path d="M8 7c1-1 2-1 3 0s2 1 3-1c1-1 1-2 0-2s-2 0-3 1-2 1-3 2z" fill="#e9c351" stroke="none" />
      <path d="M6 12c0-1 1-2 2-1s2 0 3 1 2 0 2 1-1 2-2 1-2-1-3 0-2 0-2-1z" fill="#e9c351" stroke="none" />
      <path d="M9 16c1 0 2 1 3 0s1-1 2 0 1 1 0 2-2 0-3-1-2-1-2-1z" fill="#e9c351" stroke="none" />
      {/* Language symbols - "En" and "Es" */}
      <text x="12" y="9" textAnchor="middle" fontSize="3" fill="#e9c351" fontWeight="bold">
        En
      </text>
      <text x="12" y="16" textAnchor="middle" fontSize="3" fill="#e9c351" fontWeight="bold">
        Es
      </text>
    </svg>
  )
}

export function CustomAwardIcon({ className = "h-6 w-6" }: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Award circle */}
      <circle cx="12" cy="8" r="6" fill="#2d5a3d" stroke="#2d5a3d" />
      {/* Star in center */}
      <path d="M12 5l1.5 3h3l-2.5 2 1 3-3-1.5L9 13l1-3-2.5-2h3L12 5z" fill="#e9c351" stroke="none" />
      {/* Ribbons */}
      <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" stroke="#e9c351" strokeWidth="2" fill="none" />
    </svg>
  )
}

export function CustomShieldIcon({ className = "h-6 w-6" }: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Shield background */}
      <path
        d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
        fill="#2d5a3d"
        stroke="#2d5a3d"
      />
      {/* Checkmark */}
      <path d="m9 12 2 2 4-4" stroke="#e9c351" strokeWidth="2.5" fill="none" />
    </svg>
  )
}