import axios from "axios"
import { toast } from "sonner"

type ErrorMeta = {
    errorMsg: string,
    suppressGlobalError?: boolean
}

export const handleApiError(error: unknown, meta?: ErrorMeta): void {
    if(meta?.suppressGlobalError) return

    const status = getErrorStatus(error)

    if(status === 403) {
        toast.error(meta?.errorMsg ?? 'Unauthorized action!')
        return
    }

    if(status === undefined || status >= 500) {
        toast.error(meta?.errorMsg ?? 'Something went wrong. Please try again!')
    }
}

export function getErrorStatus(error: unknown): number | undefined {
    if(axios.isAxiosError(error)) {
        return error.response?.status
    }

    if(typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number') {
        return error.status
    }

    return undefined
}