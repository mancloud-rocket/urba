const paths = {
  panel: (
    <>
      <path d="M3 6.5a2.5 2.5 0 0 1 2.5-2.5h13A2.5 2.5 0 0 1 21 6.5v11A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
      <path d="M3 9h18" />
      <path d="M9 20V9" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3 19c.5-3 3-5 6-5s5.5 2 6 5" />
      <path d="M15 11a3 3 0 0 0 0-6" opacity=".6" />
      <path d="M21 19c-.3-1.8-1.4-3.2-3-4" opacity=".6" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1 11.5A1.5 1.5 0 0 1 16.5 21h-9a1.5 1.5 0 0 1-1.5-1.5z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  agent: (
    <>
      <path d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-4 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <circle cx="9" cy="10" r=".75" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10" r=".75" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r=".75" fill="currentColor" stroke="none" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  arrowUp: <path d="m6 14 6-6 6 6" />,
  arrowDown: <path d="m6 10 6 6 6-6" />,
  check: <path d="m5 12 5 5 9-11" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  bell: (
    <>
      <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 6 2 7H4c.5-1 2-3 2-7Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  command: (
    <path d="M8 6a2 2 0 1 1 0 4H6m2 0v8m0 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm0-8h8m0 0V6a2 2 0 1 1 4 0 2 2 0 0 1-2 2m-2 0v8m0 0h2a2 2 0 1 1-2 2v-2m0 0H8" />
  ),
  upRight: <path d="M7 17 17 7M9 7h8v8" />,
  spark: (
    <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-3.6-6.4-2.1 2.1m-6.6 6.6-2.1 2.1m0-10.8 2.1 2.1m6.6 6.6 2.1 2.1" />
  ),
  building: (
    <>
      <path d="M4 21V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v15" />
      <path d="M3 21h18" />
      <path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" />
    </>
  ),
  trending: <path d="M3 17 9 11l4 4 8-8m0 0h-5m5 0v5" />,
  receipt: (
    <>
      <path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  send: <path d="M3 12 21 4l-3 18-7-6-2 5-2-5-4-4z" />,
  whatsapp: (
    <path d="M3 21 4.5 16A8.5 8.5 0 1 1 8 19.5z m6-13.5a4.5 4.5 0 0 0-2.5 8.3c.4.5 2 2.5 5 3.7s3.2.7 3.8.6 1.7-.7 2-1.4.3-1.3.2-1.4-.4-.2-.8-.4-2.3-1.2-2.7-1.3-.6-.2-.9.2-1 1.3-1.2 1.5-.4.3-.8.1-1.5-.6-2.9-1.8c-1.1-1-1.8-2.2-2-2.6s0-.6.2-.8l.6-.7c.2-.2.2-.4.4-.6s0-.5-.1-.7-.8-2-1.1-2.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.5z" />
  ),
};

export default function Icon({ name, size = 16, className = "", strokeWidth = 1.5 }) {
  const path = paths[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
