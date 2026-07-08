import { describe, expect, it } from 'vitest'
import { compareVersionsDesc, majorSeries, versionsBetween } from './versionSort'

describe('compareVersionsDesc', () => {
  it('sorts numerically per segment, newest first', () => {
    const input = ['6.0.9', '7.0.7', '7.0.10', '6.0.15', '7.0.2']
    expect([...input].sort(compareVersionsDesc)).toEqual(['7.0.10', '7.0.7', '7.0.2', '6.0.15', '6.0.9'])
  })

  it('sorts longer versions above their prefix', () => {
    expect(['7.0', '7.0.1'].sort(compareVersionsDesc)).toEqual(['7.0.1', '7.0'])
  })

  it('handles non-numeric names deterministically', () => {
    expect(['beta', '1.0'].sort(compareVersionsDesc)).toEqual(['1.0', 'beta'])
  })
})

describe('majorSeries', () => {
  it('groups by leading major number', () => {
    expect(majorSeries('7.0.7')).toBe('7.x')
    expect(majorSeries('6.0.15')).toBe('6.x')
    expect(majorSeries('notes')).toBe('Other')
  })
})

describe('versionsBetween', () => {
  const all = ['7.0.7', '7.0.6', '7.0.5', '7.0.4', '6.0.15']

  it('returns versions newer than from, up to and including to', () => {
    expect(versionsBetween(all, '7.0.4', '7.0.7')).toEqual(['7.0.7', '7.0.6', '7.0.5'])
  })

  it('is order-insensitive between the two endpoints', () => {
    expect(versionsBetween(all, '7.0.7', '7.0.4')).toEqual(['7.0.7', '7.0.6', '7.0.5'])
  })

  it('returns empty when versions are equal', () => {
    expect(versionsBetween(all, '7.0.7', '7.0.7')).toEqual([])
  })
})
