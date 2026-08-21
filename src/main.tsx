import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { getErrorStatus } from '@/lib/handle-server-error'
import { deLocalizeUrl, localizeUrl } from '@/paraglide/runtime'
import { routeTree } from '@/routeTree.gen.ts'

import '@/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        const status = getErrorStatus(error)

        if (status && status >= 400 && status < 500) {
          return false
        }

        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
  },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  rewrite: {
    input: ({url}) => deLocalizeUrl(url),
    output: ({url}) => localizeUrl(url)
  }
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
