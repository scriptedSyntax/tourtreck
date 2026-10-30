export function formatCurrency(value: string | number, currency = "KES") {
  const amount = new Intl.NumberFormat("en-KE", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
  const currencyLabel = currency.toUpperCase() === "KES" ? "KSh" : currency.toUpperCase();
  return `${currencyLabel} ${amount}`;
}
