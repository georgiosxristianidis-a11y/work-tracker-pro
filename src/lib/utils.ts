export const formatMoney = (val: number, decimals: number = 2) => {
  const cleanVal = parseFloat(val.toFixed(decimals));
  const parts = cleanVal.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.join(',');
};

