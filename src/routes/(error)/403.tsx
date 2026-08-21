import { createFileRoute } from '@tanstack/react-router'

import { UnauthorizedError } from '@/features/errors/unauthorized-error'

export const Route = createFileRoute('/(error)/403')({
  component: UnauthorizedError,
})
