type ClassValue = string | number | null | undefined | Record<string, boolean>;

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flatMap(input => {
      if (!input) return [];
      if (typeof input === 'string' || typeof input === 'number') return [input];
      return Object.entries(input)
        .filter(([, value]) => Boolean(value))
        .map(([key]) => key);
    })
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ');
}
