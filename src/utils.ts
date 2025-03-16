/**
 * Get date range parameters with defaults
 */
export function getDateRange(
  startDate?: string,
  endDate?: string
): { startDate: string; endDate: string } {
  const today = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setMonth(today.getMonth() - 3); // 3 months ago by default

  return {
    startDate: startDate || formatDate(defaultStartDate),
    endDate: endDate || formatDate(today),
  };
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return "";
  if (typeof date === "string") return date;

  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

/**
 * Format currency amounts for display
 */
export function formatAmount(amount: number | undefined | null): string {
    if (amount === undefined || amount === null) return "N/A";
    
    // Convert from cents to dollars
    const dollars = amount / 100;
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(dollars);
  }