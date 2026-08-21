// import { useSearch } from '@tanstack/react-router'

import { zodResolver } from '@hookform/resolvers/zod'
import { getRouteApi } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useLoginMutation } from '@/features/auth/hooks/use-auth-mutations'
import { signInFormSchema } from '@/features/auth/schemas/auth.schema'
import type { SignInFormValues } from '@/features/auth/types/auth.types'

const route = getRouteApi('/(auth)/sign-in')

export function SignIn() {
    const navigate = route.useNavigate()
    const { redirect } = route.useSearch()

    const loginMutation = useLoginMutation()
    const loading = loginMutation.isPending

    const form = useForm<SignInFormValues>({
        resolver: zodResolver(signInFormSchema),
        defaultValues: {
            email: '',
            password: ''
        }
    })

    function handleResetForm() {
        form.reset()
    }

    async function onSubmit(payload: SignInFormValues) {

        const { user } = await loginMutation.mutateAsync(payload)
        toast.success(`Welcome back ${user.displayName}!`)
        console.log(redirect)
        navigate({ to: redirect ?? '/', replace: true})
        //error handled by axios interceptor response already
    }

    return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className='max-w-lg mx-auto'>
            <Field>
                <FieldLabel htmlFor='email-input'>Email</FieldLabel>
                <Input id='email-input' type='email' placeholder='example@gmail.com' {...form.register('email')}></Input>
            </Field>
            <Field>
                <FieldLabel htmlFor='password-input'>Password</FieldLabel>
                <Input type='password' {...form.register('password')}></Input>
            </Field>
            <FieldDescription>
                Enter email and password to login!
            </FieldDescription>
            <Field orientation='horizontal'>
                <Button type='button' disabled={loading} onClick={handleResetForm}>Reset</Button>
                <Button type='submit' disabled={loading}>Submit</Button>
            </Field>
        </FieldGroup>
    </form>
  )
}