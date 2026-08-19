import axios from 'axios'
import { toast } from 'sonner'

export type ErrorMeta = {
  errorMsg: string
  suppressGlobalError?: boolean
}

export function handleApiError(error: unknown, meta?: ErrorMeta): void {
  if (meta?.suppressGlobalError) return

  const status = getErrorStatus(error)
  const backendMsg = getBackendErrorMessage(error)

  if (status === 403) {
    toast.error(meta?.errorMsg ?? backendMsg ?? 'Unauthorized action!')
    return
  }

  if (status && status >= 400 && status < 500) {
    toast.error(meta?.errorMsg ?? backendMsg ?? 'Invalid request. Please check your input!')
  }

  if (status === undefined || status >= 500) {
    toast.error(meta?.errorMsg ?? backendMsg ?? 'Something went wrong. Please try again!')
  }
}

export function handleSessionError(): void {
  //TODO: remove stored access token in local storage

  if (window.location.pathname !== '/login') {
    const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/login?redirect=${redirectUrl}`
  }
}

export function getErrorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status
  }

  return undefined
}

function getBackendErrorMessage(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data

    if (typeof data === 'string') return data

    if (data && typeof data === 'object' && 'message' in data) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message
    }
  }
}
