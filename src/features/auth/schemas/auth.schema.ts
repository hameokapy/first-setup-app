import z from "zod";

import { apiResponseSchema } from "@/lib/api-response.schema";

const userPrincipalSchema = z.object({
    id: z.string(),
    email: z.email(),
    firstName: z.string(),
    lastName: z.string(),
    displayName: z.string()
})

const tokenResponseSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number().optional()
})

const signInFormSchema = z.object({
    email: z.email({
        error: iss => iss.input === "" ? "Please enter your email." : undefined
    }),
    password: z.string().min(1, "Please enter your password.")
})

const loginResponseSchema = z.object({
    ...userPrincipalSchema.shape,
    ...tokenResponseSchema.shape
})

const loginApiResponseSchema = apiResponseSchema(loginResponseSchema)

export {
    userPrincipalSchema,
    tokenResponseSchema,
    signInFormSchema,
    loginApiResponseSchema
}