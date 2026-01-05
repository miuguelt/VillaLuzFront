import { cn } from "./cn";

export type SpinnerProps = {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  label?: string; // screen-reader label, defaults to "Cargando"
};

const sizeMap: Record<NonNullable<SpinnerProps["size"]>, string> = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
};

export function Spinner({ size = "md", className, label = "Cargando" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center justify-center align-middle", className)}
      aria-label={label}
    >
      <svg
        className={cn("animate-spin", sizeMap[size])}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-25 stroke-current"
          cx="12"
          cy="12"
          r="10"
          strokeWidth="4"
        />
        <path
          className="opacity-90 stroke-current"
          d="M4 12a8 8 0 018-8"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export default Spinner;