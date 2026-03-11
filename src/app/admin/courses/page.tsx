import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { toggleCourseStatus } from './actions'
import EditCourseDialog from './EditCourseDialog'
import AddCourseForm from './AddCourseForm'

export default async function AdminCoursesPage() {
    const supabase = await createClient()

    // Fetch courses with manager info
    const { data: courses } = await supabase
        .from('courses')
        .select(`
      id, name, category, fee, promoter_commission_rate, is_active, canvas_course_id, created_at,
      staff:course_staff (
        role,
        user:users ( email, full_name )
      )
    `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    // Fetch available managers (users with course_manager role) for the edit dialog
    const { data: managersRaw } = await supabase
        .from('users')
        .select('id, full_name, email, roles ( name )')
        .order('full_name')

    const managers = (managersRaw || [])
        .filter(u => {
            const role = Array.isArray(u.roles) ? u.roles[0] : u.roles
            return (role as { name: string } | null)?.name === 'course_manager'
        })
        .map(u => ({ id: u.id, full_name: u.full_name, email: u.email }))

    const mentors = (managersRaw || [])
        .filter(u => {
            const role = Array.isArray(u.roles) ? u.roles[0] : u.roles
            return (role as { name: string } | null)?.name === 'mentor'
        })
        .map(u => ({ id: u.id, full_name: u.full_name, email: u.email }))

    return (
        <div className="space-y-6 flex flex-col h-full">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Course Management</h2>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* ADD COURSE FORM */}
                <div className="xl:col-span-1">
                    <Card className="shadow-sm h-fit sticky top-24">
                        <CardHeader>
                            <CardTitle>Add New Course</CardTitle>
                            <CardDescription>Import from Canvas LMS or add manually.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AddCourseForm />
                        </CardContent>
                    </Card>
                </div>

                {/* DATA TABLE */}
                <Card className="xl:col-span-2 shadow-sm flex flex-col h-full">
                    <CardHeader>
                        <CardTitle>Active Directory</CardTitle>
                        <CardDescription>List of all provisioned courses in the system.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                        <div className="rounded-md border h-full overflow-y-auto w-full">
                            <div className="min-w-full inline-block align-middle">
                                <div className="overflow-hidden">
                                    <Table className="min-w-full">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Course Name</TableHead>
                                                <TableHead>Fee</TableHead>
                                                <TableHead>Comm %</TableHead>
                                                <TableHead>Canvas ID</TableHead>
                                                <TableHead>Manager</TableHead>
                                                <TableHead>Mentor</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {!courses || courses.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center h-24">No courses found.</TableCell>
                                                </TableRow>
                                            ) : (
                                                courses.map((course: any) => {
                                                    return (
                                                        <TableRow key={course.id}>
                                                            <TableCell className="font-medium">
                                                                {course.name}
                                                                <div className="text-xs text-muted-foreground">{course.category}</div>
                                                            </TableCell>
                                                            <TableCell>₹{course.fee}</TableCell>
                                                            <TableCell>{course.promoter_commission_rate}%</TableCell>
                                                            <TableCell>
                                                                {course.canvas_course_id ? (
                                                                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{course.canvas_course_id}</span>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">Not set</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {course.staff?.filter((s: any) => s.role === 'course_manager').map((s: any) => (
                                                                    <div key={s.user.email} className="mb-2 last:mb-0">
                                                                        <div className="text-sm">{s.user.full_name}</div>
                                                                        <div className="text-xs text-muted-foreground">{s.user.email}</div>
                                                                    </div>
                                                                ))}
                                                                {course.staff?.filter((s: any) => s.role === 'course_manager').length === 0 && (
                                                                    <span className="text-xs text-muted-foreground">Unassigned</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {course.staff?.filter((s: any) => s.role === 'mentor').map((s: any) => (
                                                                    <div key={s.user.email} className="mb-2 last:mb-0">
                                                                        <div className="text-sm">{s.user.full_name}</div>
                                                                        <div className="text-xs text-muted-foreground">{s.user.email}</div>
                                                                    </div>
                                                                ))}
                                                                {course.staff?.filter((s: any) => s.role === 'mentor').length === 0 && (
                                                                    <span className="text-xs text-muted-foreground">Unassigned</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${course.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                                    }`}>
                                                                    {course.is_active ? 'Active' : 'Disabled'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex gap-2 justify-end">
                                                                    <EditCourseDialog
                                                                        course={{
                                                                            id: course.id,
                                                                            name: course.name,
                                                                            category: course.category,
                                                                            fee: Number(course.fee),
                                                                            promoter_commission_rate: course.promoter_commission_rate ? Number(course.promoter_commission_rate) : null,
                                                                            assigned_manager_ids: course.staff?.filter((s: any) => s.role === 'course_manager').map((s: any) => s.user.id) || [],
                                                                            assigned_mentor_ids: course.staff?.filter((s: any) => s.role === 'mentor').map((s: any) => s.user.id) || [],
                                                                            canvas_course_id: course.canvas_course_id,
                                                                            course_groups: course.course_groups || [],
                                                                            applicable_classes: null,
                                                                            class_group_name: null
                                                                        }}
                                                                        managers={managers}
                                                                        mentors={mentors}
                                                                    />
                                                                    <form action={toggleCourseStatus.bind(null, course.id, course.is_active)}>
                                                                        <Button variant="outline" size="sm" type="submit" className="text-xs">
                                                                            {course.is_active ? 'Disable' : 'Enable'}
                                                                        </Button>
                                                                    </form>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
