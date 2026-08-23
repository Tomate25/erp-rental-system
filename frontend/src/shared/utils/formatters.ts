export const formatCurrency = (amount: number = 0): string => {
  const val = isNaN(Number(amount)) ? 0 : Number(amount);
  return `C$ ${val.toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};
