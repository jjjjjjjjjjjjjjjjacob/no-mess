export function AuthDivider() {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="h-[3px] flex-1 bg-foreground/10" />
      <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
        OR
      </span>
      <div className="h-[3px] flex-1 bg-foreground/10" />
    </div>
  );
}
