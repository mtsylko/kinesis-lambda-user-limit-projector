import { InvalidEventError } from './invalid-event-error';

function parseDecimal(value: unknown): { sign: bigint; digits: string; scale: number } {
  if (typeof value !== 'string') {
    throw new InvalidEventError(`Invalid decimal value: ${String(value)}`);
  }

  const normalized = value.trim();
  const match = normalized.match(/^([+-])?(\d+)(?:\.(\d+))?$/);

  if (!match) {
    throw new InvalidEventError(`Invalid decimal value: ${value}`);
  }

  const [, signSymbol, integerPart, fractionPart = ''] = match;
  const sign = signSymbol === '-' ? -1n : 1n;

  return {
    sign,
    digits: integerPart + fractionPart,
    scale: fractionPart.length,
  };
}

function toScaledInteger(
  value: { sign: bigint; digits: string; scale: number },
  targetScale: number,
): bigint {
  const padding = targetScale - value.scale;
  const scaledDigits = value.digits + '0'.repeat(padding);

  return BigInt(scaledDigits) * value.sign;
}

function formatScaledInteger(value: bigint, scale: number): string {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const raw = absolute.toString();

  if (scale === 0) {
    return `${sign}${raw}`;
  }

  const padded = raw.padStart(scale + 1, '0');
  const integerPart = padded.slice(0, -scale);
  const fractionPart = padded.slice(-scale).replace(/0+$/, '');

  if (fractionPart.length === 0) {
    return `${sign}${integerPart}`;
  }

  return `${sign}${integerPart}.${fractionPart}`;
}

export function addDecimalStrings(a: string, b: string): string {
  const left = parseDecimal(a);
  const right = parseDecimal(b);
  const targetScale = Math.max(left.scale, right.scale);

  const result = toScaledInteger(left, targetScale) + toScaledInteger(right, targetScale);
  return formatScaledInteger(result, targetScale);
}
