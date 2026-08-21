type AuthenticatedLayoutProps = {
    children?: React.ReactNode
}

export function AuthenticatedLayout({children}: AuthenticatedLayoutProps) {
    return (
        <div>
            {children}
        </div>
    )
}