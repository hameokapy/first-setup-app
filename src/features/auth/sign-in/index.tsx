import { useSearch } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export function SignIn() {
    const { redirect } = useSearch({ from: '/(auth)/sign-in'})

    return (
    <FieldGroup>
        <Field>
            <FieldLabel htmlFor='email-input'>Email</FieldLabel>
            <Input id='email-input' type='email' placeholder='example@gmail.com' name='email'></Input>
        </Field>
        <Field>
            <FieldLabel htmlFor='password-input'>Password</FieldLabel>
            <Input type='password' name='password'></Input>
        </Field>
        <FieldDescription>
            Enter email and password to login!
        </FieldDescription>
        <Field orientation='horizontal'>
            <Button type='button'>Reset</Button>
            <Button type='submit'>Submit</Button>
        </Field>
    </FieldGroup>
  )
}