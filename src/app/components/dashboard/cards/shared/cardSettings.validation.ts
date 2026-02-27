export function sanitizeCardTitle(input: string) {
  const cleaned = input.replace(/[^\u4e00-\u9fa5A-Za-z0-9\s]/g, '');
  return cleaned.slice(0, 20);
}

export function isValidCardTitle(input: string) {
  if (!input || !input.trim()) return false;
  if (input.length > 20) return false;
  return /^[\u4e00-\u9fa5A-Za-z0-9\s]+$/.test(input);
}

export function canAddEntity(currentCount: number) {
  return currentCount < 6;
}
