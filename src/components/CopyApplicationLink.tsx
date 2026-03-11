'use client'

import React, { useState } from 'react'
import { Link, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface CopyApplicationLinkProps {
    applicationId: string
}

export default function CopyApplicationLink({ applicationId }: CopyApplicationLinkProps) {
    const [copied, setCopied] = useState(false)

    const copyToClipboard = async () => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
        const followUpUrl = `${baseUrl}/apply?id=${applicationId}`

        try {
            await navigator.clipboard.writeText(followUpUrl)
            setCopied(true)
            toast.success("Follow-up link copied to clipboard")
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy link:', err)
            toast.error("Failed to copy link")
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium transition-all"
        >
            {copied ? (
                <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-green-600">Copied</span>
                </>
            ) : (
                <>
                    <Link className="h-3.5 w-3.5" />
                    <span>Follow-up Link</span>
                </>
            )}
        </Button>
    )
}
