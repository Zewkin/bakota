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

const splitCountryCode = (digits: string) => {
  if (digits.startsWith('380')) return ['380', digits.slice(3)];
  if (digits.startsWith('1') || digits.startsWith('7')) return [digits.slice(0, 1), digits.slice(1)];
  if (digits.length <= 4) return [digits, ''];
  if (digits.length <= 11) return [digits.slice(0, 2), digits.slice(2)];
  return [digits.slice(0, 3), digits.slice(3)];
};

const hyphenatePhoneTail = (digits: string) => {
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  const parts = [digits.slice(0, 3)];
  let rest = digits.slice(3);
  while (rest.length > 4) {
    parts.push(rest.slice(0, 2));
    rest = rest.slice(2);
  }
  if (rest.length > 2) {
    parts.push(rest.slice(0, 2), rest.slice(2));
  } else if (rest) {
    parts.push(rest);
  }
  return parts.filter(Boolean).join('-');
};

export const formatPhone = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (raw === '+') return '+';

  const normalized = normalizePhone(raw);
  const digits = normalized.replace(/\D/g, '');
  if (!digits) return '';

  const [countryCode, nationalNumber] = splitCountryCode(digits);
  if (!nationalNumber) return `+${countryCode}`;

  const areaLength = Math.min(nationalNumber.length, countryCode === '380' ? 2 : 3);
  const areaCode = nationalNumber.slice(0, areaLength);
  const tail = nationalNumber.slice(areaLength);

  return `+${countryCode}${areaCode ? ` (${areaCode})` : ''}${tail ? ` ${hyphenatePhoneTail(tail)}` : ''}`;
};

export const formatPhoneInput = (value: string) => formatPhone(value);
