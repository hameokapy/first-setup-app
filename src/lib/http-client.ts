import axios, { AxiosError } from 'axios'

import { handleSessionError } from '@/lib/handle-server-error'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/'

const http = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if(error.response?.status === 401) {
      handleSessionError()
    }

    return Promise.reject(error)
  }
)
