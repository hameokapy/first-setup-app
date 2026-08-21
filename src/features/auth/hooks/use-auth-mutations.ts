import { useMutation } from "@tanstack/react-query";

import { userPrincipalSchema } from "@/features/auth/schemas/auth.schema";
import { authService } from "@/features/auth/services/auth.service";
import type { SignInFormValues } from "@/features/auth/types/auth.types";
import { useAuthStore } from "@/stores/auth-store";

export function useLoginMutation() {
    const { auth } = useAuthStore.getState()

    return useMutation({
        mutationFn: async (payload: SignInFormValues) => {
            const response = await authService.login(payload)
            const user = userPrincipalSchema.parse(response.data)
            
            auth.setUser(user)
            auth.setAccessToken(response.data.accessToken)

            return {user}
        }
    })
}