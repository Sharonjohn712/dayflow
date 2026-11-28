import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dowInitial, getLast7Days, greeting, habitStreak, today } from './utils'

describe('date helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('today() returns YYYY-MM-DD', () => {
    expect(today()).toBe('2026-03-10')
  })

  it('getLast7Days() ends today, oldest first', () => {
    expect(getLast7Days()).toEqual([
      '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07',
      '2026-03-08', '2026-03-09', '2026-03-10',
    ])
  })

  describe('habitStreak', () => {
    it('counts consecutive days ending today', () => {
      expect(habitStreak(['2026-03-10', '2026-03-09', '2026-03-08'])).toBe(3)
    })

    it('stops at the first gap', () => {
      expect(habitStreak(['2026-03-10', '2026-03-09', '2026-03-07'])).toBe(2)
    })

    it('is 0 when today is not checked', () => {
      expect(habitStreak(['2026-03-09', '2026-03-08'])).toBe(0)
      expect(habitStreak([])).toBe(0)
    })
  })
})

describe('dowInitial', () => {
  it('returns the weekday initial for a date', () => {
    expect(dowInitial('2026-03-08')).toBe('S') // Sunday
    expect(dowInitial('2026-03-09')).toBe('M')
    expect(dowInitial('2026-03-13')).toBe('F')
  })
})

describe('greeting', () => {
  afterEach(() => vi.useRealTimers())

  function at(hour: number) {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 10, hour))
  }

  it('picks the greeting from the local hour', () => {
    at(8)
    expect(greeting()).toBe('Good morning 🌅')
    at(14)
    expect(greeting()).toBe('Good afternoon ☀️')
    at(20)
    expect(greeting()).toBe('Good evening 🌙')
  })

  it('includes the name when given', () => {
    at(8)
    expect(greeting('Sam')).toBe('Good morning, Sam 🌅')
  })
})
