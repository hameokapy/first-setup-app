import axios, { type AxiosRequestConfig } from 'axios'

import { handleApiError } from '@/lib/handle-server-error'
import { useAuthStore } from '@/stores/auth-store'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/'

const http = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use(async (config) => {
  const accessToken = useAuthStore.getState().auth.accessToken

  if(accessToken && !config.headers.has('Authorization')) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }

  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    handleApiError(error)

    return Promise.reject(error)
  }
)

type PathParamValue = string | number
type PathParamName<Path extends string> = Path extends `${string}:${infer Param}/${infer Rest}` ? Param | PathParamName<Rest> : Path extends `${string}:${infer Param}` ? Param : never

export const axiosClient = {
  get: async<Endpoint extends string, TResponse> (
    endpoint: Endpoint,
    queryParams?: Record<string, string | number>,
    params?: Record<PathParamName<Endpoint>, PathParamValue>,
    config?: AxiosRequestConfig
  ): Promise<TResponse> => {
    const url = generateCompletedEndpoint(endpoint, params)

    const response = await http.get(url, {
      params: queryParams,
      ...config,
    })
    return response.data
  },
  post: async<TResponse> (endpoint: string, payload: unknown): Promise<TResponse> => {
    const response = await http.post(endpoint, payload)
    return response.data
  }
}

function generateCompletedEndpoint(endpoint: string, params?: Record<string, PathParamValue>): string {
  if(params === undefined) {
    return endpoint
  }

  return endpoint.replace(/:([a-zA-Z0-9]+)/g, (_, key) => {
    if(params[key] === undefined)
       throw new Error('No value found for key: ' + key)
    return String(params[key])
  })
}