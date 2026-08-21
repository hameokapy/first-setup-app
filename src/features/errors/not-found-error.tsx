import { useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { m } from "@/paraglide/messages"

export function NotFoundError() {
    const navigate = useNavigate()

    return (
        <div className="flex flex-1 flex-col gap-2 text-center">
            <h1 className="text-8xl font-bold color text-gray-800">404</h1>
            <p>{m.not_found_message()}</p>
            <span>
                <Button className="bg-gray-200 border-gray-700" variant='outline' onClick={() => navigate({ to: '/'})}>{m.return_homepage()}</Button>
            </span>
        </div>
    )
}