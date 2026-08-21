import { loginApiResponseSchema } from "@/features/auth/schemas/auth.schema";
import type { LoginApiResponse, LoginResponse, SignInFormValues } from "@/features/auth/types/auth.types";
import { axiosClient } from "@/lib/http-client";

const endpoints = {
    login: '/auth/v1/login'
}

async function login (payload: SignInFormValues): Promise<LoginApiResponse> {
    const response = await axiosClient.post<LoginResponse>(endpoints.login, payload)
    return loginApiResponseSchema.parse(response)
    // error already handled by response interceptor
}

export const authService = {
    endpoints,
    login
}