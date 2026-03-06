'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Optionally log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4 text-center">
            <div className="w-full max-w-md space-y-4 rounded-xl border bg-white p-8 shadow-sm dark:bg-zinc-900">
                <h2 className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                    Something went wrong!
                </h2>
                <p className="text-sm text-muted-foreground">
                    A critical application error occurred while rendering the interface. Our system has logged the issue.
                </p>
                <div className="flex gap-4 justify-center mt-6">
                    <Button onClick={() => reset()} className="w-full bg-slate-900 text-white">
                        Try again
                    </Button>
                    <Button variant="outline" onClick={() => window.location.href = '/dashboard'} className="w-full">
                        Return Home
                    </Button>
                </div>
            </div>
        </div>
    )
}
