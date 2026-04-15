import { describe, expect, it, vi } from 'vitest';
import { createKeyedOneFlightLoader, createOneFlightLoader } from './one-flight';

describe('createOneFlightLoader', () => {
  it('deduplicates concurrent calls and allows later refreshes', async () => {
    let resolveCurrent: ((value: string) => void) | undefined;
    const load = vi
      .fn<() => Promise<string>>()
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveCurrent = resolve;
          }),
      )
      .mockResolvedValueOnce('ready');
    const oneFlight = createOneFlightLoader(load);

    const first = oneFlight();
    const second = oneFlight();

    expect(load).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);

    expect(resolveCurrent).toBeTypeOf('function');
    resolveCurrent?.('ready');
    await expect(first).resolves.toBe('ready');

    await expect(oneFlight()).resolves.toBe('ready');
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('createKeyedOneFlightLoader', () => {
  it('deduplicates by key only while requests are in flight', async () => {
    const load = vi.fn(async (key: string) => `${key}-done`);
    const keyedOneFlight = createKeyedOneFlightLoader(load);

    const firstA = keyedOneFlight('a');
    const secondA = keyedOneFlight('a');
    const firstB = keyedOneFlight('b');

    expect(load).toHaveBeenCalledTimes(2);
    expect(firstA).toBe(secondA);
    expect(firstA).not.toBe(firstB);

    await expect(firstA).resolves.toBe('a-done');
    await expect(firstB).resolves.toBe('b-done');

    await keyedOneFlight('a');
    expect(load).toHaveBeenCalledTimes(3);
  });
});
