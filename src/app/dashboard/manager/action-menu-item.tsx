'use client'

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useTransition } from "react"

interface ActionMenuItemProps {
    action: () => Promise<void>
    children: React.ReactNode
}

export function ActionMenuItem({ action, children }: ActionMenuItemProps) {
    const [isPending, startTransition] = useTransition()

    return (
        <DropdownMenuItem
            disabled={isPending}
            onSelect={(e) => {
                e.preventDefault()
                startTransition(async () => {
                    await action()
                })
            }}
            className="cursor-pointer w-full"
        >
            {children}
        </DropdownMenuItem>
    )
}
