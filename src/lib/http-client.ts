import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL

if (!baseURL) {
  throw new Error('base url is not configured')
}

export const http = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})
