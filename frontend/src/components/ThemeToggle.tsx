import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="btn btn-ghost px-2.5 py-2"
    >
      <span aria-hidden="true" className="text-lg">
        {isDark ? "☀️" : "🌙"}
      </span>
      <span className="hidden sm:inline text-xs">
        {isDark ? "Day" : "Night"}
      </span>
    </button>
  );
}
