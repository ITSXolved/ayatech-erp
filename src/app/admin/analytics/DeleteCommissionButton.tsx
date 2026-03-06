'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteCommission } from './actions'

export default function DeleteCommissionButton({ id, claimant }: { id: string; claimant: string }) {
    const [isPending, startTransition] = useTransition()

    const handleDelete = () => {
        if (!confirm(`Are you sure you want to delete this commission for ${claimant}?`)) {
            return
        }
        startTransition(async () => {
            const result = await deleteCommission(id)
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
            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
            title="Delete Record"
        >
            {isPending ? (
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
            )}
        </Button>
    )
}
