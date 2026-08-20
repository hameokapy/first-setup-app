import axios, { type AxiosRequestConfig } from 'axios'

import { handleApiError } from '@/lib/handle-server-error'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/'

const http = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    handleApiError(error)

    return Promise.reject(error)
  }
)

export const axiosClient = {
  get: async (
    endpoint: string,
    queryParams: Record<string, unknown>,
    params: Record<string, unknown>,
    config: AxiosRequestConfig
  ) => {
    const url = generateCompletedEndpoint(endpoint, params)

    const response = await http.get(url, {
      params: queryParams,
      ...config,
    })
    return response.data
  },
}

function generateCompletedEndpoint(endpoint: string, params: Record<string, unknown>): string {
  return endpoint.replace(/:([a-zA-Z0-9]+)/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `:${key}`
  })
}
