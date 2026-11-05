/** Joins class names, skipping falsy values: cn('btn', active && 'is-active') */
export const cn = (...classes: (string | false | null | undefined)[]): string => classes.filter(Boolean).join(' ');
