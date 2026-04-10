import { create } from 'zustand'

type CounterState = {
  count: number
  step: number
  increment: () => void
  decrement: () => void
  reset: () => void
  setStep: (value: number) => void
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  step: 1,
  increment: () =>
    set((state) => ({
      count: state.count + state.step,
    })),
  decrement: () =>
    set((state) => ({
      count: state.count - state.step,
    })),
  reset: () => set({ count: 0, step: 1 }),
  setStep: (value) =>
    set({
      step: Number.isFinite(value) && value > 0 ? Math.floor(value) : 1,
    }),
}))
