import Link from 'next/link'
import { enforceAdminGuard } from '@/lib/guards'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Enforce across all nested /admin routes
    await enforceAdminGuard()

    return (
        <div className="flex min-h-screen w-full bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-50">
            {/* Sidebar (Dark Blue ERP style) */}
            <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col bg-[#0a192f] text-white md:flex shadow-2xl transition-all duration-300">
                <div className="flex h-16 shrink-0 items-center px-6 border-b border-white/10 bg-[#06101e]">
                    <Link
                        href="/admin"
                        className="flex items-center gap-2 text-xl font-bold tracking-tight text-white"
                    >
                        Ayatech ERP
                    </Link>
                </div>

                <nav className="flex flex-1 flex-col gap-1.5 p-4 overflow-y-auto">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4 px-2">Management</div>
                    <Link
                        href="/admin/staff"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                    >
                        <svg className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        Staff & Roles
                    </Link>
                    <Link
                        href="/admin/applications"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                    >
                        <svg className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Applications
                    </Link>
                    <Link
                        href="/admin/courses"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                    >
                        <svg className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        Courses
                    </Link>
                    <Link
                        href="/admin/courses/scheduling"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                    >
                        <svg className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Class Scheduling
                    </Link>

                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6 px-2">Reports</div>
                    <Link
                        href="/admin/finance"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                    >
                        <svg className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Finance
                    </Link>
                    <Link
                        href="/admin/analytics"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                    >
                        <svg className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Analytics
                    </Link>
                </nav>

                <div className="p-4 border-t border-white/10 mt-auto bg-[#06101e]">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                    >
                        <svg className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Exit to Dashboard
                    </Link>
                </div>
            </aside>

            {/* Mobile Nav Top Bar */}
            <div className="flex flex-col md:pl-64 w-full min-h-screen bg-slate-50 dark:bg-zinc-950">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white dark:bg-zinc-900 px-4 md:hidden shadow-sm">
                    <Link
                        href="/admin"
                        className="flex items-center gap-2 text-lg font-bold text-[#0a192f] dark:text-white"
                    >
                        Ayatech ERP
                    </Link>
                    <Link
                        href="/dashboard"
                        className="text-sm font-medium text-slate-500"
                    >
                        Exit
                    </Link>
                </header>

                {/* Main Content Area: White Background */}
                <main className="flex-1 w-full bg-white dark:bg-zinc-950 p-6 md:p-10">
                    <div className="mx-auto w-full max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
