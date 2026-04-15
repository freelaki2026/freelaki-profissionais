/**
 * Returns the platform fee rate based on the contract creation date.
 * Weekdays (Mon-Fri) = 5%, Weekends (Sat-Sun) = 7%.
 * Mirrors the DB function public.get_platform_fee_rate().
 */
export function getPlatformFeeRate(contractCreatedAt: string | Date): number {
  const d = typeof contractCreatedAt === "string" ? new Date(contractCreatedAt) : contractCreatedAt;
  const day = d.getDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6 ? 0.07 : 0.05;
}

export function getFeePercentLabel(contractCreatedAt: string | Date): string {
  const rate = getPlatformFeeRate(contractCreatedAt);
  return `${Math.round(rate * 100)}%`;
}
