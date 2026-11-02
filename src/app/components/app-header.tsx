import { Link } from "react-router";

export function AppHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b-2 border-ink bg-paper px-4 py-3 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-stretch overflow-hidden rounded-md border-2 border-ink bg-card text-2xl font-black leading-none tracking-tight shadow-hard transition-transform hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none-hard"
      >
        <span className="px-2 py-1.5">notas</span>
        <span className="border-l-2 border-ink bg-accent px-2 py-1.5">.</span>
      </Link>
      {children}
    </header>
  );
}
