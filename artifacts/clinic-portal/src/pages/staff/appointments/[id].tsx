import { useStaffAuth } from '@/hooks/use-staff-auth';
import { StaffLayout, AppointmentStatusBadge } from './../dashboard';
import { useGetAppointment, useCancelAppointment, useResendLink, useGetAppointmentSummaries, useGetDoctorDocuments, getGetAppointmentQueryKey } from '@workspace/api-client-react';
import { useParams, Link } from 'wouter';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, FileText, Activity, Link as LinkIcon, Download, AlertTriangle, FileBox, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AppointmentDetail() {
  const { id } = useParams();
  const { user } = useStaffAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: appointment, isLoading } = useGetAppointment(id || '', { 
    query: { 
      enabled: !!id,
      queryKey: getGetAppointmentQueryKey(id || '')
    } 
  });

  const { data: summaries } = useGetAppointmentSummaries(id || '', {
    query: {
      enabled: !!id && user?.role === 'doctor' && ['submitted', 'locked'].includes(appointment?.status || ''),
      queryKey: ['appointmentSummaries', id]
    }
  });

  const { data: documentsData } = useGetDoctorDocuments(id || '', {
    query: {
      enabled: !!id && user?.role === 'doctor',
      queryKey: ['appointmentDocuments', id]
    }
  });

  const cancelMutation = useCancelAppointment();
  const resendMutation = useResendLink();
  const [magicLink, setMagicLink] = useState<string | null>(null);

  if (isLoading) {
    return <StaffLayout title="Appointment Detail"><Skeleton className="h-[600px] w-full" /></StaffLayout>;
  }

  if (!appointment) {
    return <StaffLayout title="Not Found"><p>Appointment not found.</p></StaffLayout>;
  }

  const isAdmin = user?.role === 'clinic_admin';
  const isDoctor = user?.role === 'doctor';

  const handleCancel = () => {
    if (confirm("Cancel this appointment? This cannot be undone.")) {
      cancelMutation.mutate({ id: appointment.id }, {
        onSuccess: () => {
          toast({ title: 'Appointment Cancelled' });
          queryClient.invalidateQueries({ queryKey: getGetAppointmentQueryKey(appointment.id) });
        }
      });
    }
  };

  const handleResend = () => {
    resendMutation.mutate({ id: appointment.id }, {
      onSuccess: (res) => {
        toast({ title: 'Link Generated' });
        if (res.linkUrl) setMagicLink(res.linkUrl);
      }
    });
  };

  return (
    <StaffLayout title={`Appointment: ${appointment.invitedFullName}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{appointment.invitedFullName}</h2>
          <div className="flex items-center gap-4 mt-2 text-gray-600">
            <span className="flex items-center gap-1"><Calendar size={16}/> {format(new Date(appointment.scheduledAt), 'PPP')}</span>
            <span className="flex items-center gap-1"><Clock size={16}/> {format(new Date(appointment.scheduledAt), 'p')}</span>
            <AppointmentStatusBadge status={appointment.status} />
          </div>
        </div>
        
        <div className="flex gap-2">
          {isDoctor && appointment.patientId && (
            <Link href={`/patients/${appointment.patientId}/history`}>
              <Button variant="outline" className="gap-2"><Activity size={16} /> Patient History</Button>
            </Link>
          )}
          {isAdmin && appointment.status !== 'cancelled' && (
            <>
              <Button variant="outline" onClick={handleResend} disabled={resendMutation.isPending} className="gap-2">
                <LinkIcon size={16} /> Resend Link
              </Button>
              <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>
                Cancel Visit
              </Button>
            </>
          )}
        </div>
      </div>

      {magicLink && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <LinkIcon className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Magic Link Generated</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="flex gap-2 items-center">
              <code className="bg-white p-2 rounded border border-blue-100 flex-1 text-sm">{magicLink}</code>
              <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(magicLink); toast({ title: 'Copied!'}); }}>Copy</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isAdmin && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Operational Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">Visit Type:</span>
                <span className="font-medium">{appointment.appointmentType}</span>
                <span className="text-gray-500">Contact:</span>
                <span className="font-medium">{appointment.invitedPhone}</span>
                <span className="text-gray-500">Attending:</span>
                <span className="font-medium">Dr. {appointment.doctor?.fullName}</span>
                <span className="text-gray-500">Created:</span>
                <span className="font-medium">{format(new Date(appointment.createdAt), 'PPP')}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Questionnaire Status</CardTitle></CardHeader>
            <CardContent>
              {appointment.questionnaire ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 size={20} />
                    <span className="font-medium">Started</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Consent given:</span>
                      <span>{appointment.questionnaire.consentGivenAt ? format(new Date(appointment.questionnaire.consentGivenAt), 'Pp') : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last saved:</span>
                      <span>{appointment.questionnaire.savedAt ? format(new Date(appointment.questionnaire.savedAt), 'Pp') : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-gray-500">Submitted:</span>
                      <span>{appointment.questionnaire.submittedAt ? format(new Date(appointment.questionnaire.submittedAt), 'Pp') : 'Pending'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle size={20} />
                  <span>Not started by patient yet.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {isDoctor && (
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="bg-white border w-full justify-start rounded-b-none border-b-0 h-12 px-2">
            <TabsTrigger value="summary" className="text-base py-2">Clinical Summary</TabsTrigger>
            <TabsTrigger value="questionnaire" className="text-base py-2">Raw Answers</TabsTrigger>
            <TabsTrigger value="documents" className="text-base py-2">Documents</TabsTrigger>
          </TabsList>
          
          <Card className="rounded-t-none border-t-0 shadow-none border-x border-b mb-8">
            <CardContent className="p-6">
              <TabsContent value="summary" className="m-0 mt-0">
                {summaries?.summaries && summaries.summaries.length > 0 ? (
                  <div className="grid grid-cols-2 gap-8">
                    {summaries.summaries.map(summary => (
                      <div key={summary.id} className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <h4 className="font-semibold text-lg mb-4 text-primary capitalize flex items-center gap-2">
                          <FileText size={18} />
                          {summary.variant.replace(/_/g, ' ')}
                        </h4>
                        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                          {summary.content}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <AlertTriangle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p>Clinical summary will be generated once the patient submits their preparation.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="questionnaire" className="m-0 mt-0">
                {appointment.questionnaire?.answers ? (
                  <div className="space-y-6">
                    {Object.entries(appointment.questionnaire.answers as Record<string, any>).map(([section, answers]) => (
                      <div key={section} className="border-b pb-6 last:border-0">
                        <h4 className="font-semibold text-gray-800 mb-3 capitalize">{section.replace(/_/g, ' ')}</h4>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                          {Object.entries(answers).map(([key, val]) => (
                            <div key={key}>
                              <div className="text-gray-500 mb-1">{key}</div>
                              <div className="font-medium">
                                {Array.isArray(val) ? val.join(', ') : typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val || '-')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>Patient hasn't provided answers yet.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="m-0 mt-0">
                {documentsData?.documents && documentsData.documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documentsData.documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded-xl hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <FileBox size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{doc.originalFileName}</p>
                            <p className="text-xs text-gray-500">{(doc.fileSizeBytes / 1024 / 1024).toFixed(2)} MB • {doc.mimeType}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Download size={18} />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No documents uploaded for this visit.</p>
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      )}
    </StaffLayout>
  );
}
