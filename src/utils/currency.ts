/**
 * Formats a number to Indian Rupee (₹) format.
 * Examples:
 * 12500 -> ₹12,500
 * 125000 -> ₹1,25,000
 */
export const formatRupee = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};
