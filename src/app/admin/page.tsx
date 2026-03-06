import { redirect } from 'next/navigation'

export default function AdminIndex() {
    // Directly point the root /admin to /admin/analytics as the primary entry
    redirect('/admin/analytics')
}
