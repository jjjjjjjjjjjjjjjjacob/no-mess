/**
 * Custom bauhaus-style sidebar collapse icon.
 * Three horizontal bars of decreasing width.
 */
export function SidebarCollapseIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="square"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="16.5" y2="12" />
      <line x1="3" y1="18" x2="12" y2="18" />
    </svg>
  );
}
