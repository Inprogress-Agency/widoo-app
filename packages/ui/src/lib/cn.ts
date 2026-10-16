import { clsx, type ClassValue } from 'clsx';

/**
 * Joins class names, dropping the falsy ones. No conflict resolution: a component never sets
 * twice the same property, and a caller adds layout classes only (margin, width, grid place).
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
