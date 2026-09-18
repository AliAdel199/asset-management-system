const commonProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export const navIcons: Record<string, React.ReactNode> = {
  dashboard: (
    <svg {...commonProps}>
      <rect height="8" rx="1.5" width="8" x="3" y="3" />
      <rect height="5" rx="1.5" width="8" x="13" y="3" />
      <rect height="5" rx="1.5" width="8" x="3" y="16" />
      <rect height="8" rx="1.5" width="8" x="13" y="11" />
    </svg>
  ),
  assets: (
    <svg {...commonProps}>
      <path d="M12 3 3.5 7.5 12 12l8.5-4.5L12 3Z" />
      <path d="M3.5 7.5v9L12 21l8.5-4.5v-9" />
      <path d="M12 12v9" />
    </svg>
  ),
  vehicles: (
    <svg {...commonProps}>
      <path d="M4 16V11.5L6 7h12l2 4.5V16" />
      <path d="M4 16h16v2.5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V17H7v1.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V16Z" />
      <circle cx="7.5" cy="16" r="1.4" />
      <circle cx="16.5" cy="16" r="1.4" />
    </svg>
  ),
  lands: (
    <svg {...commonProps}>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  ),
  properties: (
    <svg {...commonProps}>
      <path d="M4 21V8l8-5 8 5v13" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 11h.01M15 11h.01M9 15h.01M15 15h.01" />
    </svg>
  ),
  maintenance: (
    <svg {...commonProps}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 4.7L3 17.3V21h3.7l6.3-6.3a4 4 0 0 0 4.7-5.4l-2.8 2.8-2-2 2.8-2.8Z" />
    </svg>
  ),
  reports: (
    <svg {...commonProps}>
      <path d="M4 20V10M12 20V4M20 20v-7" />
      <path d="M2.5 20h19" />
    </svg>
  ),
  "audit-log": (
    <svg {...commonProps}>
      <path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  "transfer-requests": (
    <svg {...commonProps}>
      <rect height="16" rx="2" width="14" x="5" y="4" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="m9 13 2.5 2.5L15 11" />
    </svg>
  ),
  "write-off-requests": (
    <svg {...commonProps}>
      <rect height="16" rx="2" width="14" x="5" y="4" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="m9 10 6 6M15 10l-6 6" />
    </svg>
  ),
  admin: (
    <svg {...commonProps}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.6 3-6.2 7-6.2s7 2.6 7 6.2" />
      <path d="M18.5 4.5 20 6l-2 2-1.5-1.5Z" />
    </svg>
  ),
};
