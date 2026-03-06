'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteStaff } from './actions'

export default function DeleteStaffButton({ userId, userName }: { userId: string; userName: string }) {
    const [isPending, startTransition] = useTransition()

    const handleDelete = () => {
        if (!confirm(`Are you sure you want to delete "${userName}"? This will remove their account, role, and course assignments permanently.`)) {
            return
        }
        startTransition(async () => {
            const result = await deleteStaff(userId)
            if (result?.error) {
                alert(result.error)
            }
        })
    }

    return (
        <Button
            size="icon"
            variant="ghost"
            onClick={handleDelete}
            disabled={isPending}
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
            title="Delete Staff"
        >
            {isPending ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
            )}
        </Button>
    )
}
