// cn.ts - Utility to compose conditional classNames similar to clsx
// Supports strings, numbers, arrays, and object maps { 'class': condition }

export type ClassDictionary = Record<string, any>;
export type ClassValue = string | number | null | undefined | boolean | ClassDictionary | ClassValue[];

export function cn(...args: ClassValue[]): string {
  const classes: string[] = [];

  const push = (val: ClassValue): void => {
    if (!val && val !== 0) return;

    if (typeof val === "string" || typeof val === "number") {
      classes.push(String(val));
      return;
    }

    if (Array.isArray(val)) {
      for (const v of val) push(v);
      return;
    }

    if (typeof val === "object") {
      for (const [key, value] of Object.entries(val)) {
        if (value) classes.push(key);
      }
    }
  };

  for (const arg of args) push(arg);

  return classes.join(" ");
}

export default cn;