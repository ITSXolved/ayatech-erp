import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Determine Role
    const { data: roleData } = await supabase.rpc('get_user_role')
    const role = roleData || 'student'

    if (role === 'admin') {
        redirect('/admin/analytics')
    }
    if (role === 'course_manager') {
        redirect('/dashboard/manager')
    }
    if (role === 'promoter') {
        redirect('/dashboard/promoter')
    }
    if (role === 'mentor') {
        redirect('/dashboard/mentor')
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col p-8 dark:bg-zinc-950 text-slate-900 dark:text-slate-50">
            <header className="mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Main Dashboard</h1>
                <form action={async () => {
                    'use server'
                    const supabase = await createClient()
                    await supabase.auth.signOut()
                    redirect('/login')
                }}>
                    <Button variant="outline" type="submit">Sign Out</Button>
                </form>
            </header>

            <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
                {/* KPI Cards Placeholder */}
                <div className="col-span-1 border rounded-lg p-6 bg-white dark:bg-zinc-900 shadow-sm">
                    <h2 className="text-lg font-medium text-slate-600 dark:text-slate-400">Welcome back</h2>
                    <p className="text-2xl font-bold">{user.email}</p>
                </div>
            </main>
        </div>
    )
}
