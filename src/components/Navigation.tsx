import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

type Icon = (props: { className?: string }) => ReactNode;

function svg(children: ReactNode): Icon {
  return ({ className }) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

const TodayIcon = svg(
  <>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </>,
);
const LibraryIcon = svg(
  <>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />
  </>,
);
const CollectionsIcon = svg(
  <>
    <rect x="3.5" y="9" width="17" height="11" rx="2" />
    <path d="M6.5 5.5h11M8.5 2.5h7" />
  </>,
);
const ProgressIcon = svg(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />);
const SettingsIcon = svg(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
  </>,
);

const links: { to: string; label: string; end?: boolean; Icon: Icon }[] = [
  { to: "/", label: "Today", end: true, Icon: TodayIcon },
  { to: "/library", label: "Library", Icon: LibraryIcon },
  { to: "/collections", label: "Collections", Icon: CollectionsIcon },
  { to: "/progress", label: "Progress", Icon: ProgressIcon },
  { to: "/settings", label: "Settings", Icon: SettingsIcon },
];

function linkClasses(isActive: boolean): string {
  return [
    "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors",
    "sm:flex-row sm:gap-2 sm:text-sm sm:px-4",
    isActive
      ? "text-blue-700 dark:text-blue-400"
      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
  ].join(" ");
}

export function Navigation() {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:sticky sm:top-0 sm:border-b sm:border-t-0 sm:pb-0 dark:border-slate-800 dark:bg-slate-900/95"
    >
      <ul className="mx-auto flex max-w-3xl list-none">
        {links.map(({ to, label, end, Icon }) => (
          <li key={to} className="flex flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) => linkClasses(isActive)}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
