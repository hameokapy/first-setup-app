import { type z } from "zod";

import type { loginApiResponseSchema, signInFormSchema, tokenResponseSchema, userPrincipalSchema } from "@/features/auth/schemas/auth.schema";

type UserPrincipal = z.infer<typeof userPrincipalSchema>
type TokenResponse = z.infer<typeof tokenResponseSchema>
type SignInFormValues = z.infer<typeof signInFormSchema>

type LoginResponse = UserPrincipal & TokenResponse

type LoginApiResponse = z.infer<typeof loginApiResponseSchema>

export type {
    UserPrincipal,
    TokenResponse,
    SignInFormValues,
    LoginResponse,
    LoginApiResponse
}