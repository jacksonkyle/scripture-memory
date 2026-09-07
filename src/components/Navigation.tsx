import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Today", end: true },
  { to: "/library", label: "Library" },
  { to: "/collections", label: "Collections" },
  { to: "/progress", label: "Progress" },
  { to: "/settings", label: "Settings" },
];

function linkClasses(isActive: boolean): string {
  return [
    "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors",
    "sm:flex-row sm:gap-2 sm:text-sm sm:px-4",
    isActive ? "text-blue-700" : "text-slate-500 hover:text-slate-800",
  ].join(" ");
}

export function Navigation() {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur sm:sticky sm:top-0 sm:border-b sm:border-t-0"
    >
      <ul className="mx-auto flex max-w-3xl list-none">
        {links.map((link) => (
          <li key={link.to} className="flex flex-1">
            <NavLink
              to={link.to}
              end={link.end}
              className={({ isActive }) => linkClasses(isActive)}
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
