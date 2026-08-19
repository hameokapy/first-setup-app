import { createFileRoute } from '@tanstack/react-router'
import { Toaster } from 'sonner'

import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main>
      <Button>Home page button</Button>
      <Toaster/>
    </main>
  )
}
