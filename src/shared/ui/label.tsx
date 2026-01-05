import * as React from "react";
import { cn } from "./cn";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
  helperText?: string;
};

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, helperText, children, ...props }, ref) => {
    return (
      <div className="inline-flex flex-col gap-1">
        <label
          ref={ref}
          className={cn(
            "text-sm font-medium text-foreground",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            className
          )}
          {...props}
        >
          <span>
            {children}
            {required ? <span className="ml-0.5 text-destructive" aria-hidden="true">*</span> : null}
          </span>
        </label>
        {helperText ? (
          <span className="text-xs text-muted-foreground">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Label.displayName = "Label";

export default Label;
