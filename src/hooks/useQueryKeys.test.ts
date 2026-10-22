import { describe, expect, it } from 'vitest'
import { getQueryKeys } from './useQueryKeys'

describe('getQueryKeys', () => {
  const baseUrl = 'http://192.168.1.100'

  it("builds every key as ['wled', baseUrl, resource]", () => {
    for (const [name, key] of Object.entries(getQueryKeys(baseUrl))) {
      expect(key, name).toEqual(['wled', baseUrl, name])
    }
  })

  it('scopes keys per controller', () => {
    expect(getQueryKeys('http://a').state).not.toEqual(getQueryKeys('http://b').state)
  })
})
