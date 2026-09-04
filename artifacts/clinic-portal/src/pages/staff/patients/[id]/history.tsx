import { useStaffAuth } from '@/hooks/use-staff-auth';
import { StaffLayout, AppointmentStatusBadge } from '../../dashboard';
import { useGetPatientHistory } from '@workspace/api-client-react';
import { useParams, Link } from 'wouter';
import { format } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Calendar, Clock, FileText, User } from 'lucide-react';

export default function PatientHistory() {
  const { id } = useParams();
  const { user } = useStaffAuth();
  
  const { data, isLoading } = useGetPatientHistory(id || '', {
    query: {
      enabled: !!id && user?.role === 'doctor',
      queryKey: ['patientHistory', id]
    }
  });

  if (isLoading) {
    return <StaffLayout title="Patient History"><Skeleton className="h-96 w-full" /></StaffLayout>;
  }

  if (!data?.patient) {
    return <StaffLayout title="Not Found"><p>Patient history not accessible.</p></StaffLayout>;
  }

  const { patient, appointments } = data;

  return (
    <StaffLayout title={`Patient: ${patient.fullName}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="md:col-span-1 border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><User size={18} /> Demographics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">DOB:</span>
              <span className="font-medium">{format(new Date(patient.dateOfBirth), 'PPP')}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">Sex:</span>
              <span className="font-medium">{patient.sex || 'Unknown'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">Phone:</span>
              <span className="font-medium">{patient.phone}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-gray-500">First Visit:</span>
              <span className="font-medium">{format(new Date(patient.createdAt), 'MMM yyyy')}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Activity size={18} /> Clinical Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative border-l border-gray-200 ml-3 space-y-6 pb-4">
              {appointments?.length === 0 ? (
                <p className="pl-6 text-gray-500">No appointments recorded.</p>
              ) : (
                appointments?.map(appt => (
                  <div key={appt.id} className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-primary rounded-full -left-[6.5px] top-1.5 ring-4 ring-white"></div>
                    <div className="bg-white border rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <Link href={`/appointments/${appt.id}`} className="hover:underline font-semibold text-primary">
                          {format(new Date(appt.scheduledAt), 'PPP')} — {appt.appointmentType}
                        </Link>
                        <AppointmentStatusBadge status={appt.status} />
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Clock size={14} /> {format(new Date(appt.scheduledAt), 'p')} • Dr. {appt.doctor?.fullName}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}
