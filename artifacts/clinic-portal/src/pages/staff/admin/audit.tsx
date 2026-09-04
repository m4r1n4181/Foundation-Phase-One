import { useStaffAuth } from '@/hooks/use-staff-auth';
import { StaffLayout } from '../dashboard';
import { useGetAuditLog } from '@workspace/api-client-react';
import { format } from 'date-fns';

import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';

export default function AdminAuditLog() {
  const { user } = useStaffAuth();
  const { data: logs, isLoading } = useGetAuditLog({ limit: 100 }, {
    query: {
      enabled: user?.role === 'clinic_admin',
      queryKey: ['auditLogs']
    }
  });

  if (user?.role !== 'clinic_admin') return null;

  return (
    <StaffLayout title="Audit Log">
      <div className="mb-6">
        <p className="text-gray-600 flex items-center gap-2">
          <Activity size={16} /> Real-time system activity tracking
        </p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-auto max-h-[700px]">
          <Table>
            <TableHeader className="bg-gray-50 sticky top-0">
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target ID</TableHead>
                <TableHead>Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(10).fill(0).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                ))
              ) : (
                logs?.map((log) => (
                  <TableRow key={log.id} className="text-sm">
                    <TableCell className="whitespace-nowrap text-gray-500">
                      {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-900">{log.actorEmail || log.actorId || 'System'}</span>
                      <span className="ml-2 text-xs text-gray-400 capitalize">({log.actorType})</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.action}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {log.appointmentId || log.patientId || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        log.outcome === 'success' ? 'text-green-700 bg-green-50 border-green-200' :
                        log.outcome === 'failure' ? 'text-red-700 bg-red-50 border-red-200' :
                        'text-orange-700 bg-orange-50 border-orange-200'
                      }>
                        {log.outcome}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </StaffLayout>
  );
}
