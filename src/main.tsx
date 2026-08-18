import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, Router, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { type ErrorMeta, handleApiError } from '@/lib/handle-server-error'
import { routeTree } from '@/routeTree.gen.ts'

import '@/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if(query.state.data !== undefined) {
        handleApiError(error, query.meta as ErrorMeta)
      }
    }
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      handleApiError(error, mutation.meta as ErrorMeta)
    }
  })
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    route: typeof Router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
