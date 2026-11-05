/** 'true' → true, 'false' → false, anything else → undefined (no filter). */
export const parseActive = (value?: string): boolean | undefined =>
  value === 'true' ? true : value === 'false' ? false : undefined;

/** '1,2, 5' → [1, 2, 5] */
export const parseIdList = (value?: string): number[] =>
  (value ?? '')
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

export const addHours = (date: Date, hours: number): Date => new Date(date.getTime() + hours * 3_600_000);
