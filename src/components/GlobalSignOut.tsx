import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default async function GlobalSignOut() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return null
    }

    return (
        <form action={async () => {
            'use server'
            const sb = await createClient()
            await sb.auth.signOut()
            redirect('/login')
        }}>
            <button
                type="submit"
                className="fixed top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 shadow-sm border border-slate-200 transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:bg-zinc-800 dark:text-slate-400 dark:border-zinc-700 dark:hover:bg-red-950 dark:hover:text-red-400"
                title="Sign Out"
            >
                <LogOut className="h-4 w-4" />
            </button>
        </form>
    )
}
