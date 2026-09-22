const UINT32_RANGE = 0x1_0000_0000;

/** Returns an unbiased random integer in [0, maxExclusive). */
export function randomIndex(maxExclusive: number): number {
  if (
    !Number.isSafeInteger(maxExclusive) ||
    maxExclusive <= 0 ||
    maxExclusive > UINT32_RANGE
  ) {
    throw new RangeError(
      "maxExclusive must be a positive integer no larger than 2^32"
    );
  }

  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
    const values = new Uint32Array(1);

    do {
      cryptoApi.getRandomValues(values);
    } while (values[0] >= limit);

    return values[0] % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}
