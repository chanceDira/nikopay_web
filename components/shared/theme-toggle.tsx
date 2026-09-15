"use client";

const SunIcon = () => (
  <svg
    className="h-4.5 w-4.5 text-niko-teal"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"
    />
  </svg>
);

const MoonIcon = () => (
  <svg
    className="h-4.5 w-4.5 text-niko-teal"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className = "h-9 w-9" }: ThemeToggleProps) {
  const toggleTheme = () => {
    const isLight = document.documentElement.classList.toggle("light");
    localStorage.setItem("nikopay_theme", isLight ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex cursor-pointer items-center justify-center rounded-md border border-niko-border bg-niko-surface text-foreground outline-none hover:border-niko-teal/40 ${className}`}
      aria-label="Toggle theme"
    >
      <span className="niko-theme-sun">
        <SunIcon />
      </span>
      <span className="niko-theme-moon">
        <MoonIcon />
      </span>
    </button>
  );
}
