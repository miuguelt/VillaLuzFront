// cva.ts - Utilidad mínima de variantes compatible con class-variance-authority (API básica)
import { cn } from "@/shared/ui/cn";

/**
 * Tipos básicos inspirados en class-variance-authority, simplificados para este proyecto.
 */
export type VariantDefinitions = Record<string, Record<string, string | undefined>>;
export type DefaultVariants<T extends VariantDefinitions> = {
  [K in keyof T]?: keyof T[K];
};
export type CompoundVariant<T extends VariantDefinitions> = {
  class: string;
} & {
  [K in keyof T]?: keyof T[K];
};
export type CvaOptions<T extends VariantDefinitions> = {
  variants?: T;
  defaultVariants?: DefaultVariants<T>;
  compoundVariants?: Array<CompoundVariant<T>>;
};

export type VariantProps<T extends VariantDefinitions> = {
  class?: string;
  className?: string;
} & {
  [K in keyof T]?: keyof T[K];
};

/**
 * cva: genera una función que compone clases a partir de variantes.
 * Uso:
 * const button = cva("inline-flex", {
 *   variants: {
 *     variant: { primary: "bg-primary", secondary: "bg-secondary" },
 *     size: { sm: "h-8", md: "h-9" },
 *   },
 *   defaultVariants: { variant: "primary", size: "md" },
 *   compoundVariants: [
 *     { variant: "primary", size: "sm", class: "shadow-sm" }
 *   ]
 * });
 * const cls = button({ variant: "secondary", size: "sm", className: "w-full" });
 */
export function cva<T extends VariantDefinitions = VariantDefinitions>(
  base?: string | string[],
  options?: CvaOptions<T>
) {
  const baseClass = Array.isArray(base) ? base.join(" ") : base ?? "";
  const variants = options?.variants ?? ({} as T);
  const defaultVariants = options?.defaultVariants ?? ({} as DefaultVariants<T>);
  const compoundVariants = options?.compoundVariants ?? ([] as Array<CompoundVariant<T>>);

  return (props: VariantProps<T> = {} as VariantProps<T>) => {
    const classes: string[] = [];
    if (baseClass) classes.push(baseClass);

    // Aplicar variantes (usando value de props o default)
    for (const key in variants) {
      const def = variants[key];
      const value = (props[key] ?? defaultVariants[key]) as keyof typeof def | undefined;
      if (value && def[value] != null) {
        const v = def[value];
        if (v) classes.push(v);
      }
    }

    // Compound variants
    for (const cv of compoundVariants) {
      let matches = true;
      for (const key in variants) {
        if (key in cv) {
          const expected = cv[key] as any;
          const received = (props as any)[key] ?? (defaultVariants as any)[key];
          if (expected !== received) {
            matches = false;
            break;
          }
        }
      }
      if (matches && cv.class) classes.push(cv.class);
    }

    // class / className del consumidor
    if (props.class) classes.push(props.class);
    if (props.className) classes.push(props.className);

    return cn(classes.join(" "));
  };
}

/**
 * Tipos de ayuda para extraer las props de variantes desde la definición.
 */
export type VariantPropsOf<T extends ReturnType<typeof cva>> = T extends (
  props: infer P
) => any
  ? P
  : never;

export default cva;