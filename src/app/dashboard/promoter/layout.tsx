import Link from 'next/link'
import { enforcePromoterGuard } from '@/lib/promoter-guard'

export default async function PromoterLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Enforce across all nested /dashboard/promoter routes
    await enforcePromoterGuard()

    return (
        <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-50">
            <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-white dark:bg-zinc-900 px-4 md:px-6 z-10 shadow-sm">
                <nav className="flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6 w-full">
                    <Link
                        href="/dashboard/promoter"
                        className="flex items-center gap-2 text-lg font-semibold md:text-base text-indigo-600 dark:text-indigo-400"
                    >
                        Promoter Hub
                    </Link>
                    <div className="ml-auto text-sm font-semibold flex items-center gap-6">
                        <Link
                            href="/dashboard"
                            className="text-muted-foreground transition-colors hover:text-foreground underline underline-offset-4"
                        >
                            Back to Main Dashboard
                        </Link>
                    </div>
                </nav>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 max-w-7xl mx-auto w-full">
                {children}
            </main>
        </div>
    )
}
