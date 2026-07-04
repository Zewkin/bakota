const MAX_PHONE_DIGITS = 15;
const MIN_PHONE_DIGITS = 7;

const getPhoneDigits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

export const normalizePhone = (value: unknown) => {
  const raw = String(value ?? '').trim();
  const digits = getPhoneDigits(raw);

  if (!digits) return '';
  if (/^\s*\+/.test(raw)) return `+${digits.slice(0, MAX_PHONE_DIGITS)}`;
  if (digits.startsWith('00') && digits.length > 2) return `+${digits.slice(2, MAX_PHONE_DIGITS + 2)}`;
  if (digits.startsWith('0')) return `+38${digits.slice(0, 10)}`;
  if (digits.startsWith('380')) return `+${digits.slice(0, MAX_PHONE_DIGITS)}`;

  return `+${digits.slice(0, MAX_PHONE_DIGITS)}`;
};

export const isValidPhone = (value: unknown) => {
  const digits = normalizePhone(value).replace(/\D/g, '');
  return digits.length >= MIN_PHONE_DIGITS && digits.length <= MAX_PHONE_DIGITS;
};

export const normalizePhoneSearch = (value: unknown) => {
  const raw = String(value ?? '').trim();
  const digits = getPhoneDigits(raw);

  if (!digits) return '';
  if (/^\s*\+/.test(raw)) return `+${digits.slice(0, MAX_PHONE_DIGITS)}`;
  if (digits.startsWith('00') && digits.length > 2) return `+${digits.slice(2, MAX_PHONE_DIGITS + 2)}`;
  if (digits.startsWith('0')) return `+38${digits.slice(0, 10)}`;
  if (digits.startsWith('380')) return `+${digits.slice(0, MAX_PHONE_DIGITS)}`;

  return digits.slice(0, MAX_PHONE_DIGITS);
};
