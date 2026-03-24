export function calculateFee(type: 'id' | 'passport', subtype: 'new' | 'renewal'): number {
  if (type === 'id' && subtype === 'new') return 0;
  if (type === 'id' && subtype === 'renewal') return 140;
  return 600; // passport always R600
}

export function formatFee(amount: number): string {
  if (amount === 0) return 'FREE';
  return `R${amount}`;
}
