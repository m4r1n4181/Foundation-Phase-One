import { useStaffAuth } from '@/hooks/use-staff-auth';
import { StaffLayout } from '../dashboard';
import { useCreateAppointment, useListStaffUsers } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  invitedFullName: z.string().min(2, "Name must be at least 2 characters"),
  invitedPhone: z.string().min(5, "Valid phone required"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  doctorId: z.string().min(1, "Doctor selection is required"),
  appointmentType: z.string().min(1, "Type is required"),
  scheduledAt: z.string().min(1, "Date and time required"),
});

export default function NewAppointment() {
  const { user } = useStaffAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: staffList } = useListStaffUsers({ 
    query: { 
      enabled: user?.role === 'clinic_admin',
      queryKey: ['staffUsers']
    } 
  });
  const createMutation = useCreateAppointment();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invitedFullName: '',
      invitedPhone: '',
      dateOfBirth: '',
      doctorId: '',
      appointmentType: 'Initial Consultation',
      scheduledAt: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
    }
  });

  if (user?.role !== 'clinic_admin') {
    return (
      <StaffLayout title="Access Denied">
        <Alert variant="destructive" className="max-w-xl mx-auto mt-12">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Permission Denied</AlertTitle>
          <AlertDescription>
            Only clinic administrators can create new appointment invitations.
          </AlertDescription>
        </Alert>
      </StaffLayout>
    );
  }

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Add timezone 'Z' to ISO string to ensure proper backend parsing
    const payload = {
      ...values,
      scheduledAt: new Date(values.scheduledAt).toISOString()
    };
    
    createMutation.mutate({ data: payload }, {
      onSuccess: (res) => {
        toast({ title: 'Appointment created', description: 'Patient invitation will be sent.' });
        setLocation(`/appointments/${res.appointment.id}`);
      },
      onError: (err) => {
        toast({ title: 'Failed to create', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
      }
    });
  };

  const doctors = staffList?.filter(s => s.role === 'doctor' && s.isActive) || [];

  return (
    <StaffLayout title="New Appointment">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Invite Patient</CardTitle>
            <CardDescription>Create an appointment record and send a pre-visit preparation link to the patient.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="invitedFullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient Full Name</FormLabel>
                      <FormControl><Input placeholder="Petar Petrovic" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth (YYYY-MM-DD)</FormLabel>
                      <FormControl><Input placeholder="1980-05-15" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="invitedPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Phone</FormLabel>
                      <FormControl><Input placeholder="+381601234567" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="appointmentType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visit Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Initial Consultation">Initial Consultation</SelectItem>
                          <SelectItem value="Follow-up">Follow-up</SelectItem>
                          <SelectItem value="Post-op Check">Post-op Check</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="doctorId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attending Doctor</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {doctors.map(d => (
                            <SelectItem key={d.id} value={d.id}>Dr. {d.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="scheduledAt" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <FormControl><Input type="datetime-local" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-appointment">
                    {createMutation.isPending ? 'Creating...' : 'Create & Send Invite'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}
