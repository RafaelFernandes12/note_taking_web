import { Link } from "react-router";

/** Marca do app ("notas."), que leva para a lista de notas. */
export function AppLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="Notas — voltar para a lista"
      className={
        "inline-flex shrink-0 items-stretch overflow-hidden rounded-md border-2 border-ink bg-card font-black leading-none tracking-tight shadow-hard transition-transform hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none-hard " +
        (compact ? "text-lg" : "text-2xl")
      }
    >
      <span className={compact ? "px-1.5 py-1" : "px-2 py-1.5"}>notas</span>
      <span
        className={
          "border-l-2 border-ink bg-accent " +
          (compact ? "px-1.5 py-1" : "px-2 py-1.5")
        }
      >
        .
      </span>
    </Link>
  );
}

export function AppHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b-2 border-ink bg-paper px-4 py-3 sm:px-6">
      <AppLogo />
      {children}
    </header>
  );
}
