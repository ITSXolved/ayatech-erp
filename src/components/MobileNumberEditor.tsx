'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'

interface MobileNumberEditorProps {
    applicationId: string
    initialPhone: string
    saveAction: (applicationId: string, phone: string) => Promise<void>
}
export default function MobileNumberEditor({ applicationId, initialPhone, saveAction }: MobileNumberEditorProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [phone, setPhone] = useState(initialPhone || '')
    const [isPending, startTransition] = useTransition()

    const handleSave = () => {
        startTransition(async () => {
            await saveAction(applicationId, phone)
            setIsEditing(false)
        })
    }

    const handleCancel = () => {
        setPhone(initialPhone || '')
        setIsEditing(false)
    }

    if (!isEditing) {
        return (
            <div className="flex items-center gap-1.5 group">
                {phone ? (
                    <span className="text-xs text-muted-foreground max-w-[140px] truncate" title={phone}>
                        {phone}
                    </span>
                ) : (
                    <span className="text-xs text-muted-foreground/50 italic">No mobile</span>
                )}
                <button
                    onClick={() => setIsEditing(true)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Edit mobile number"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                    </svg>
                </button>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-1 mt-1">
            <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter mobile..."
                className="h-7 w-[120px] text-xs border rounded px-2 py-1 bg-white dark:bg-zinc-900 border-blue-300 dark:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
                disabled={isPending}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave()
                    if (e.key === 'Escape') handleCancel()
                }}
            />
            <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                onClick={handleSave}
                disabled={isPending}
                title="Save"
            >
                {isPending ? (
                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                    </svg>
                )}
            </Button>
            <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={handleCancel}
                disabled={isPending}
                title="Cancel"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
            </Button>
        </div>
    )
}
