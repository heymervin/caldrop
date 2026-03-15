// lib/caldrop/slug.ts
const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'
const LENGTH = 8

export function generateSlug(): string {
  let result = ''
  for (let i = 0; i < LENGTH; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return result
}
