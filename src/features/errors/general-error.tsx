import { useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { m } from "@/paraglide/messages"

export function GeneralError() {
    const navigate = useNavigate()

    return (
        <div className="flex flex-1 flex-col gap-2 text-center">
            <h1 className="text-8xl font-bold color text-red-900">500</h1>
            <p>{m.general_error_message()}</p>
            <span>
                <Button className="bg-red-200 border-red-700" variant='outline' onClick={() => navigate({ to: '/'})}>{m.return_homepage()}</Button>
            </span>
        </div>
    )
}