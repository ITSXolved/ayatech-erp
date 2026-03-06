import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { approveUserRole } from './actions'
import AddStaffDialog from './AddStaffDialog'
import EditStaffDialog from './EditStaffDialog'
import DeleteStaffButton from './DeleteStaffButton'
import { formatDate } from '@/lib/utils'

export default async function AdminStaffPage() {
    const supabase = await createClient()

    const { data: usersData } = await supabase
        .from('users')
        .select(`
      id, email, full_name, phone, address, date_of_birth, qualification, reporting_head_id, created_at,
      roles ( name ),
      mentors ( mentor_code ),
      course_managers ( mentor_code )
    `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    // Fetch all courses for assignment
    const { data: coursesData } = await supabase
        .from('courses')
        .select('id, name, assigned_manager_id, assigned_mentor_id')
        .is('deleted_at', null)
        .order('name')

    const allCourses = (coursesData || []).map(c => ({ id: c.id, name: c.name }))

    // Build a map: userId → [courseIds]
    const userCourseMap: Record<string, string[]> = {}
    for (const c of coursesData || []) {
        if (c.assigned_manager_id) {
            if (!userCourseMap[c.assigned_manager_id]) userCourseMap[c.assigned_manager_id] = []
            userCourseMap[c.assigned_manager_id].push(c.id)
        }
        if (c.assigned_mentor_id) {
            if (!userCourseMap[c.assigned_mentor_id]) userCourseMap[c.assigned_mentor_id] = []
            userCourseMap[c.assigned_mentor_id].push(c.id)
        }
    }

    // Build a map: userId → [courseNames]
    const userCourseNameMap: Record<string, string[]> = {}
    for (const c of coursesData || []) {
        if (c.assigned_manager_id) {
            if (!userCourseNameMap[c.assigned_manager_id]) userCourseNameMap[c.assigned_manager_id] = []
            userCourseNameMap[c.assigned_manager_id].push(c.name)
        }
        if (c.assigned_mentor_id) {
            if (!userCourseNameMap[c.assigned_mentor_id]) userCourseNameMap[c.assigned_mentor_id] = []
            userCourseNameMap[c.assigned_mentor_id].push(c.name)
        }
    }

    // Safely parse roles and referral codes
    const users = usersData?.map(u => {
        const mentorNode = Array.isArray(u.mentors) ? u.mentors[0] : u.mentors
        const managerNode = Array.isArray(u.course_managers) ? u.course_managers[0] : u.course_managers
        const referralCode = mentorNode?.mentor_code || managerNode?.mentor_code || null

        return {
            ...u,
            referralCode,
            roleName: Array.isArray(u.roles) ? u.roles[0]?.name : (u.roles as { name: string } | null)?.name || 'user'
        }
    }) || []

    const pendingUsers = users.filter(u => u.roleName === 'user')
    const staffUsers = users.filter(u => ['course_manager', 'promoter', 'mentor', 'admin'].includes(u.roleName))
    const staffListOptions = staffUsers.map(u => ({ id: u.id, full_name: u.full_name || 'Unknown', roleName: u.roleName }))

    return (
        <div className="space-y-6 flex flex-col h-full">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Staff Management</h2>
                <AddStaffDialog staffList={staffListOptions} />
            </div>

            <div className="grid grid-cols-1 gap-6">

                {/* PENDING APPROVALS */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Pending Approvals</CardTitle>
                        <CardDescription>Users who have registered but have no assigned privilege roles.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User / Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Registered</TableHead>
                                    <TableHead className="text-right">Assign Role</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground h-16">No pending users found.</TableCell>
                                    </TableRow>
                                ) : (
                                    pendingUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="font-medium">{user.full_name || 'No Name'}</div>
                                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{user.phone || '—'}</TableCell>
                                            <TableCell>{formatDate(user.created_at)}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <form className="inline-block" action={approveUserRole.bind(null, user.id, 'course_manager')}>
                                                    <Button size="sm" variant="outline" className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100">Make Manager</Button>
                                                </form>
                                                <form className="inline-block" action={approveUserRole.bind(null, user.id, 'promoter')}>
                                                    <Button size="sm" variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100">Make Promoter</Button>
                                                </form>
                                                <form className="inline-block" action={approveUserRole.bind(null, user.id, 'mentor')}>
                                                    <Button size="sm" variant="outline" className="bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 hover:bg-orange-100">Make Mentor</Button>
                                                </form>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* ACTIVE STAFF */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Active Staff</CardTitle>
                        <CardDescription>Currently assigned internal team members.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Courses</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground h-16">No staff assigned yet.</TableCell>
                                    </TableRow>
                                ) : (
                                    staffUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.full_name || 'Unknown'}</TableCell>
                                            <TableCell className="text-sm">{user.email}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{user.phone || '—'}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 uppercase tracking-wide">
                                                    {user.roleName.replace('_', ' ')}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                                                    {user.referralCode || '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {(userCourseNameMap[user.id] || []).length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {(userCourseNameMap[user.id] as string[]).map((name, i) => (
                                                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                                                {name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <EditStaffDialog
                                                        user={{
                                                            id: user.id,
                                                            full_name: user.full_name || 'Unknown',
                                                            email: user.email,
                                                            phone: user.phone,
                                                            referralCode: user.referralCode,
                                                            address: user.address,
                                                            date_of_birth: user.date_of_birth,
                                                            qualification: user.qualification,
                                                            roleName: user.roleName,
                                                            reporting_head_id: user.reporting_head_id,
                                                            assignedCourseIds: userCourseMap[user.id] || [],
                                                        }}
                                                        courses={allCourses}
                                                        staffList={staffListOptions}
                                                    />
                                                    {user.roleName !== 'admin' && (
                                                        <DeleteStaffButton userId={user.id} userName={user.full_name || user.email} />
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
