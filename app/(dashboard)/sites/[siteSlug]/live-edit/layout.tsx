export default function LiveEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Full-viewport overlay that breaks out of the dashboard padding/sidebar.
  // Uses fixed positioning to cover the entire screen.
  return <div className="fixed inset-0 z-50 bg-background">{children}</div>;
}
