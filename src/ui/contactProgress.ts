/** One name for the optional fixed contacts counted by a mission. */
export function contactProgress(found: number, total: number): string {
  return `Extra finds: ${found} of ${total}`;
}
