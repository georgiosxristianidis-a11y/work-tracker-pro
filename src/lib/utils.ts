export const formatMoney = (val: number, decimals: number = 2) => {
  const cleanVal = parseFloat(val.toFixed(decimals));
  const parts = cleanVal.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.join(',');
};

export const PRIVACY_MASK = '••••';

export const formatPrivacyMoney = (
  val: number,
  isPrivate: boolean,
  curSym: string = '',
  decimals: number = 2
): string => {
  if (isPrivate) return curSym ? `${curSym}${PRIVACY_MASK}` : PRIVACY_MASK;
  return curSym ? `${curSym}${formatMoney(val, decimals)}` : formatMoney(val, decimals);
};
