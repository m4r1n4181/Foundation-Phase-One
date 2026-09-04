import { useStaffAuth } from '@/hooks/use-staff-auth';
import { StaffLayout } from '../dashboard';
import { useListStaffUsers, useCreateStaffUser, getListStaffUsersQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Users, Shield, UserCircle, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const schema = z.object({
  fullName: z.string().min(2, "Name required"),
  email: z.string().email(),
  password: z.string().min(12, "Min 12 chars"),
  role: z.enum(['doctor', 'clinic_admin', 'nurse']),
  phone: z.string().optional()
});

export default function AdminStaffList() {
  const { user } = useStaffAuth();
  const { data: staffList, isLoading } = useListStaffUsers({
    query: {
      enabled: user?.role === 'clinic_admin',
      queryKey: getListStaffUsersQueryKey()
    }
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const createMutation = useCreateStaffUser();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', role: 'doctor', phone: '' }
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    createMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: 'User created' });
        queryClient.invalidateQueries({ queryKey: getListStaffUsersQueryKey() });
        setOpen(false);
        form.reset();
      },
      onError: (err) => {
        toast({ title: 'Failed to create', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
      }
    });
  };

  if (user?.role !== 'clinic_admin') return null;

  return (
    <StaffLayout title="Staff Management">
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">Manage access and roles for clinic staff.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus size={16} /> Add Staff</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Staff User</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="doctor">Doctor</SelectItem>
                          <SelectItem value="nurse">Nurse</SelectItem>
                          <SelectItem value="clinic_admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>Initial Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>Save User</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffList?.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{staff.fullName}</div>
                    <div className="text-xs text-gray-500">{staff.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm capitalize">
                      {staff.role === 'clinic_admin' ? <Shield size={14} className="text-red-500" /> : <UserCircle size={14} className="text-blue-500" />}
                      {staff.role.replace('_', ' ')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={staff.isActive ? 'default' : 'secondary'} className={staff.isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
                      {staff.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {staff.lastLoginAt ? format(new Date(staff.lastLoginAt), 'MMM d, yyyy') : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </StaffLayout>
  );
}
