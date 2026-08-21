import { create } from 'zustand'

import type { UserPrincipal } from "@/features/auth/types/auth.types"

const ACCESS_TOKEN = "stored_access_token"

function readLocalStorageValue(key: string) {
    const value = localStorage.getItem(key)
    return value ? value : ''   
}

interface AuthState {
    auth: {
        user: UserPrincipal | null,
        setUser: (user: UserPrincipal | null) => void
        accessToken: string
        setAccessToken: (accessToken: string) => void
        reset: () => void
    }
}

export const useAuthStore = create<AuthState>()((set) => ({
    auth: {
        user: null,
        setUser: (user) => set((state) => {
            return {...state, auth: {...state.auth, user}}
        }),
        accessToken: readLocalStorageValue(ACCESS_TOKEN),
        setAccessToken: (accessToken) => set((state) => {
            localStorage.setItem(ACCESS_TOKEN, accessToken)
            return {...state, auth: {...state.auth, accessToken}}
        }),
        reset: () => set((state) => {
            localStorage.removeItem(ACCESS_TOKEN)
            return {...state, auth: {...state.auth, accessToken: '', user: null}}
        })
    }
}))