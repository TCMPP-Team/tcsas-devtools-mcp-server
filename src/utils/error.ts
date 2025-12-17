/**
 * Safely convert any error to a string message
 * @param error The error to convert
 * @returns A string representation of the error
 */
export function errorToString(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'toString' in error) {
    return String(error);
  }
  return 'Unknown error occurred';
}
