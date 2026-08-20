import { LanguageSwitcher } from "@/components/language-switcher";

type AuthenticatedLayoutProps = {
    children?: React.ReactNode
}

export function AuthenticatedLayout({children}: AuthenticatedLayoutProps) {
    return (
        <div>
            <LanguageSwitcher />
            {children}
        </div>
    )
}