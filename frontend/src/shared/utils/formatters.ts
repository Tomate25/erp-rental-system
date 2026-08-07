export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-NI', {
    style: 'currency',
    currency: 'NIO',
    currencyDisplay: 'narrowSymbol'
  }).format(amount).replace('C$', 'C$ ');
};
