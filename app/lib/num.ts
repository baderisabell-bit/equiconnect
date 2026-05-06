export const safeToFixed = (value: any, digits = 2): string => {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return (0).toFixed(digits);
  return num.toFixed(digits);
};

export default safeToFixed;
