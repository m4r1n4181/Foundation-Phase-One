import { Link, useLocation } from 'wouter';
import { useStaffAuth } from '@/hooks/use-staff-auth';
import { useListAppointments, Appointment } from '@workspace/api-client-react';
import { format, isToday, isPast, isFuture } from 'date-fns';
import { useState, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Stethoscope, Calendar, Plus, Clock, Users, Activity, FileText, LayoutDashboard, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function StaffLayout({ children, title }: { children: React.ReactNode, title: string }) {
  const { user, logout } = useStaffAuth();
  const [, setLocation] = useLocation();

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    ...(user?.role === 'clinic_admin' ? [
      { label: 'Staff Management', icon: Users, href: '/admin/staff' },
      { label: 'Audit Log', icon: FileText, href: '/admin/audit' }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-primary-foreground flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-primary-foreground/10">
          <Stethoscope size={24} className="text-blue-200" />
          <span className="font-serif text-xl font-medium tracking-tight">Clinic<span className="text-blue-200">Portal</span></span>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 transition-colors cursor-pointer ${location.pathname.startsWith(item.href) ? 'bg-white/10 font-medium' : 'text-primary-foreground/80'}`}>
                <item.icon size={18} />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-primary-foreground/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-400/20 flex items-center justify-center font-medium">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium truncate">{user?.fullName}</div>
              <div className="text-xs text-primary-foreground/60 capitalize">{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
          <Button variant="outline" className="w-full border-primary-foreground/20 text-primary hover:bg-white/10 hover:text-white" onClick={logout}>
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b px-6 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-xl font-medium text-gray-800">{title}</h1>
          <div className="flex items-center gap-4">
            {/* Action buttons depending on page */}
          </div>
        </header>
        <div className="p-6 flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export function AppointmentStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft_invitation: "outline",
    link_sent: "secondary",
    opened: "secondary",
    in_progress: "secondary",
    submitted: "default",
    locked: "default",
    reopened: "secondary",
    rescheduled: "outline",
    cancelled: "destructive",
  };

  const labels: Record<string, string> = {
    draft_invitation: "Draft",
    link_sent: "Sent",
    opened: "Opened",
    in_progress: "In Progress",
    submitted: "Submitted",
    locked: "Locked",
    reopened: "Reopened",
    rescheduled: "Rescheduled",
    cancelled: "Cancelled",
  };

  return (
    <Badge variant={variants[status] || "outline"} className={variants[status] === "secondary" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : ""}>
      {labels[status] || status}
    </Badge>
  );
}

export default function Dashboard() {
  const { user } = useStaffAuth();
  const { data: appointments, isLoading } = useListAppointments({ 
    doctorId: user?.role === 'doctor' ? user.id : undefined 
  }, { query: { queryKey: ['appointments', user?.id] } });

  const { today, upcoming, past } = useMemo(() => {
    if (!appointments) return { today: [], upcoming: [], past: [] };
    const now = new Date();
    
    return appointments.reduce((acc, appt) => {
      const date = new Date(appt.scheduledAt);
      if (isToday(date)) acc.today.push(appt);
      else if (isFuture(date)) acc.upcoming.push(appt);
      else acc.past.push(appt);
      return acc;
    }, { today: [] as Appointment[], upcoming: [] as Appointment[], past: [] as Appointment[] });
  }, [appointments]);

  const stats = useMemo(() => {
    if (!appointments) return { total: 0, submitted: 0, pending: 0 };
    const submitted = appointments.filter(a => ['submitted', 'locked'].includes(a.status)).length;
    return {
      total: appointments.length,
      submitted,
      pending: appointments.length - submitted
    };
  }, [appointments]);

  return (
    <StaffLayout title="Dashboard">
      {user?.role === 'clinic_admin' && (
        <div className="mb-6 flex justify-end">
          <Link href="/appointments/new">
            <Button className="gap-2" data-testid="button-new-appointment">
              <Plus size={16} />
              New Appointment
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-sm border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Calendar size={16} /> Total Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-16" /> : stats.total}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Activity size={16} /> Submitted Prep
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{isLoading ? <Skeleton className="h-9 w-16" /> : stats.submitted}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Clock size={16} /> Pending Patient Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{isLoading ? <Skeleton className="h-9 w-16" /> : stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="mb-6 bg-white border">
          <TabsTrigger value="today" className="data-[state=active]:bg-primary data-[state=active]:text-white">Today ({today.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        
        {['today', 'upcoming', 'past'].map(tab => {
          const list = tab === 'today' ? today : tab === 'upcoming' ? upcoming : past;
          return (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
              ) : list.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed text-gray-400">
                  <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p>No appointments found for this view.</p>
                </div>
              ) : (
                list.map(appt => (
                  <Link key={appt.id} href={`/appointments/${appt.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer border border-gray-100 group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex flex-col items-center justify-center font-medium group-hover:bg-blue-100 transition-colors">
                            <span className="text-sm leading-none">{format(new Date(appt.scheduledAt), 'HH')}</span>
                            <span className="text-xs leading-none mt-0.5 opacity-70">{format(new Date(appt.scheduledAt), 'mm')}</span>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{appt.invitedFullName}</h3>
                            <p className="text-sm text-gray-500 flex items-center gap-2">
                              <span>{appt.appointmentType}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span>{format(new Date(appt.scheduledAt), 'MMM d, yyyy')}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <AppointmentStatusBadge status={appt.status} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </StaffLayout>
  );
}
