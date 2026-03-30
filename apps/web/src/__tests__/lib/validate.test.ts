import { describe, it, expect } from 'vitest'
import {
  ValidationError,
  requireString,
  requireIntInRange,
  requireNonNegativeInt,
} from '@/lib/validate'

describe('ValidationError', () => {
  it('is an instance of Error', () => {
    const err = new ValidationError('test')
    expect(err).toBeInstanceOf(Error)
  })

  it('has name "ValidationError"', () => {
    const err = new ValidationError('test')
    expect(err.name).toBe('ValidationError')
  })

  it('carries the provided message', () => {
    const err = new ValidationError('something went wrong')
    expect(err.message).toBe('something went wrong')
  })
})

describe('requireString', () => {
  it('returns trimmed value for a valid string', () => {
    expect(requireString('hello', 'field')).toBe('hello')
  })

  it('trims leading and trailing whitespace', () => {
    expect(requireString('  hello  ', 'field')).toBe('hello')
  })

  it('throws for an empty string', () => {
    expect(() => requireString('', 'field')).toThrow(ValidationError)
  })

  it('throws for a whitespace-only string', () => {
    expect(() => requireString('   ', 'field')).toThrow(ValidationError)
  })

  it('throws for a non-string value (number)', () => {
    expect(() => requireString(42, 'field')).toThrow(ValidationError)
  })

  it('throws for a non-string value (null)', () => {
    expect(() => requireString(null, 'field')).toThrow(ValidationError)
  })

  it('throws for a non-string value (undefined)', () => {
    expect(() => requireString(undefined, 'field')).toThrow(ValidationError)
  })

  it('throws when string exceeds default maxLength of 500', () => {
    const longString = 'a'.repeat(501)
    expect(() => requireString(longString, 'field')).toThrow(ValidationError)
  })

  it('accepts a string that is exactly the default maxLength (500)', () => {
    const exactString = 'a'.repeat(500)
    expect(requireString(exactString, 'field')).toBe(exactString)
  })

  it('throws when string exceeds custom maxLength', () => {
    expect(() => requireString('hello', 'field', 3)).toThrow(ValidationError)
  })

  it('accepts a string at exactly custom maxLength', () => {
    expect(requireString('hi', 'field', 2)).toBe('hi')
  })

  it('respects custom maxLength when trimmed', () => {
    // trimmed length is 5, maxLength is 5 — should be fine
    expect(requireString('  hello  ', 'field', 5)).toBe('hello')
  })
})

describe('requireIntInRange', () => {
  it('returns the number for a valid in-range integer', () => {
    expect(requireIntInRange(5, 'field', 1, 10)).toBe(5)
  })

  it('accepts the minimum boundary value', () => {
    expect(requireIntInRange(1, 'field', 1, 10)).toBe(1)
  })

  it('accepts the maximum boundary value', () => {
    expect(requireIntInRange(10, 'field', 1, 10)).toBe(10)
  })

  it('throws when value is below min', () => {
    expect(() => requireIntInRange(0, 'field', 1, 10)).toThrow(ValidationError)
  })

  it('throws when value is above max', () => {
    expect(() => requireIntInRange(11, 'field', 1, 10)).toThrow(ValidationError)
  })

  it('throws for a float', () => {
    expect(() => requireIntInRange(2.5, 'field', 1, 10)).toThrow(ValidationError)
  })

  it('throws for NaN', () => {
    expect(() => requireIntInRange(NaN, 'field', 1, 10)).toThrow(ValidationError)
  })

  it('coerces numeric string "5" to 5', () => {
    expect(requireIntInRange('5', 'field', 1, 10)).toBe(5)
  })

  it('throws for a negative float', () => {
    expect(() => requireIntInRange(-1.5, 'field', -10, 10)).toThrow(ValidationError)
  })
})

describe('requireNonNegativeInt', () => {
  it('returns the value for a valid non-negative integer', () => {
    expect(requireNonNegativeInt(7, 'field')).toBe(7)
  })

  it('accepts 0 as valid', () => {
    expect(requireNonNegativeInt(0, 'field')).toBe(0)
  })

  it('throws for a negative integer', () => {
    expect(() => requireNonNegativeInt(-1, 'field')).toThrow(ValidationError)
  })

  it('throws for a float', () => {
    expect(() => requireNonNegativeInt(1.5, 'field')).toThrow(ValidationError)
  })

  it('coerces numeric string "0" to 0', () => {
    expect(requireNonNegativeInt('0', 'field')).toBe(0)
  })
})
