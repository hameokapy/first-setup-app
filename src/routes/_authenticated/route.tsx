import { createFileRoute, redirect } from '@tanstack/react-router'

import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({location}) => {
    const { auth } = useAuthStore.getState()
    const redirectQuery = { redirect: location.href} 

    if(!auth.accessToken) {
      throw redirect({
        to: '/sign-in',
        search: redirectQuery
      })
    }
  },
  component: AuthenticatedLayout,
})
