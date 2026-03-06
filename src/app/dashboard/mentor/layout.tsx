import Link from 'next/link'
import { enforceMentorGuard } from '@/lib/mentor-guard'
import GlobalSignOut from '@/components/GlobalSignOut'

export default async function MentorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Enforce across all nested /mentor routes
    await enforceMentorGuard()

    return (
        <div className="flex min-h-screen w-full bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-50">
            {/* Sidebar (Dark Blue ERP style) */}
            <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col bg-[#0a192f] text-white md:flex shadow-2xl transition-all duration-300 border-r border-white/5">
                <div className="flex h-16 shrink-0 items-center px-6 border-b border-white/10 bg-[#06101e]">
                    <div className="h-8 w-8 rounded-lg mr-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <Link
                        href="/dashboard/mentor"
                        className="flex items-center gap-2 text-xl font-bold tracking-tight text-white"
                    >
                        Ayatech Mentor
                    </Link>
                </div>

                <nav className="flex flex-1 flex-col gap-1.5 p-4 overflow-y-auto">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4 px-2">Workplace</div>
                    <Link
                        href="/dashboard/mentor"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                    >
                        <svg className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Dashboard
                    </Link>

                    <Link
                        href="/dashboard/mentor/student-records"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                    >
                        <svg className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        Student Records
                    </Link>

                </nav>

                <div className="p-4 border-t border-white/10 mt-auto bg-[#06101e]">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                    >
                        <svg className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                        Exit to Dashboard
                    </Link>
                    <div className="mt-2">
                        <GlobalSignOut />
                    </div>
                </div>
            </aside>

            {/* Mobile Nav Top Bar */}
            <div className="flex flex-col md:pl-64 w-full min-h-screen bg-slate-50 dark:bg-zinc-950">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-[#0a192f] text-white px-4 md:hidden shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
                            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <span className="font-bold">Ayatech Mentor</span>
                    </div>
                    <Link
                        href="/dashboard"
                        className="text-xs font-medium text-slate-300 hover:text-white transition-colors"
                    >
                        Exit
                    </Link>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 w-full p-4 md:p-8">
                    <div className="mx-auto w-full max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
