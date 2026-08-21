import type { QueryClient } from '@tanstack/react-query'

import { createRootRouteWithContext, Outlet, redirect } from '@tanstack/react-router'
import { Toaster } from 'sonner'

import { LanguageSwitcher } from '@/components/language-switcher'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import { m } from '@/paraglide/messages'
import { getLocale, shouldRedirect } from '@/paraglide/runtime'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    document.documentElement.lang = getLocale()

    const decision = await shouldRedirect({url: window.location.href})

    if(decision.redirectUrl) {
      throw redirect({href: decision.redirectUrl.href})
    }
  },
  component: RootLayout,
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError
})

function RootLayout() {
  return (
    <>
      <LanguageSwitcher/>
      <p className='p-2'>{m.example_message({username:'Yos'})}</p>
      <Outlet />
      <Toaster richColors />
    </>
  )
}
