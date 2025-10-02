import { cn } from "@/lib/utils";

import { Loader2 } from "lucide-react";

type LoaderProps = {
  className?: string;
  size?: number;
};

export function Loader({ className, size = 24 }: LoaderProps) {
  return (
    <Loader2 className={cn("animate-spin", className)} size={size} />
  );
}

// Add CSS utility if needed
// .animate-spin {
//   animation: spin 1s linear infinite;
// }

// @keyframes spin {
//   from {
//     transform: rotate(0deg);
//   }
//   to {
//     transform: rotate(360deg);
//   }
// }