import { describe, test, expect } from 'vitest'
import { BOSS_NAME, isBoss } from './boss'
import type { Member } from './types'

const member = (fullName: string, active = true): Member => ({
  id: fullName,
  domainName: fullName,
  fullName,
  directBoss: '',
  location: '',
  active,
})

describe('isBoss', () => {
  test('recognises the boss by name', () => {
    expect(isBoss(member(BOSS_NAME))).toBe(true)
  })

  test('does not mistake anyone else for the boss', () => {
    expect(isBoss(member('Nguyễn Đăng Khoa'))).toBe(false)
  })

  test('ignores casing', () => {
    expect(isBoss(member(BOSS_NAME.toUpperCase()))).toBe(true)
  })

  test('ignores stray spacing', () => {
    expect(isBoss(member(`  ${BOSS_NAME.replace(' ', '   ')}  `))).toBe(true)
  })

  test('keeps accents significant, as elsewhere', () => {
    expect(isBoss(member('Nguyen Khanh Trung'))).toBe(false)
  })

  test('still recognises him after he is marked as having left', () => {
    expect(isBoss(member(BOSS_NAME, false))).toBe(true)
  })
})
