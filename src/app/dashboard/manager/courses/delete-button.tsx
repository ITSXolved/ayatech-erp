'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteClassSchedule } from './actions'

export function DeleteScheduleButton({ scheduleId }: { scheduleId: string }) {
    const [isPending, startTransition] = useTransition()

    return (
        <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            className="text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
            onClick={() => {
                if (!confirm('Delete this schedule?')) return
                startTransition(async () => {
                    await deleteClassSchedule(scheduleId)
                })
            }}
        >
            {isPending ? '...' : 'Delete'}
        </Button>
    )
}
