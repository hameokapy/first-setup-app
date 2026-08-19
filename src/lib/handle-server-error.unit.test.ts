import { describe, expect, it } from 'vitest'

import { getErrorStatus } from '@/lib/handle-server-error'

describe('getErrorStatus', () => {
  it('returns status from an Axios error object', () => {
    const error = {
      isAxiosError: true,
      response: { status: 401 },
    }

    expect(getErrorStatus(error)).toBe(401)
  })

  it('returns status from a regular error object', () => {
    const error = {
      status: 400,
    }

    expect(getErrorStatus(error)).toBe(400)
  })

  it('returns undefined when the error has no valid status', () => {
    expect(getErrorStatus(new Error('Network error'))).toBeUndefined()
    expect(getErrorStatus(null)).toBeUndefined()
  })
})
