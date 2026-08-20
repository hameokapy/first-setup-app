import { Button } from "@/components/ui/button"
import { getLocale, locales, setLocale } from "@/paraglide/runtime"

const localNames = {
    en: 'English',
    vi: "Tiếng Việt"
}

export function LanguageSwitcher() {
    const currentLocale = getLocale()

    return (
        <div>
            {locales.map(locale => (
                <Button 
                    key={locale} 
                    type="button" 
                    variant={locale===currentLocale ? 'default' : 'outline'}
                    onClick={() => setLocale(locale)}
                >
                    {localNames[locale]}
                    </Button>
            ))}
        </div>
    )
}