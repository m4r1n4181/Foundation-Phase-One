import { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useVerifyDob } from '@workspace/api-client-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Stethoscope, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const dobSchema = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format mora biti GGGG-MM-DD"),
});

export default function PrepareLanding() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const verifyMutation = useVerifyDob();

  const form = useForm<z.infer<typeof dobSchema>>({
    resolver: zodResolver(dobSchema),
    defaultValues: { dateOfBirth: '' },
  });

  const onSubmit = (values: z.infer<typeof dobSchema>) => {
    verifyMutation.mutate({ data: { token: token || '', dateOfBirth: values.dateOfBirth } }, {
      onSuccess: (res) => {
        if (res.sessionId) sessionStorage.setItem('patient_session_id', res.sessionId);
        setLocation(`/prepare/${token}/otp`);
      },
      onError: () => {
        toast({ title: 'Greška', description: 'Podaci nisu tačni ili je link istekao.', variant: 'destructive' });
      }
    });
  };

  return (
    <div className="min-h-screen bg-patient-portal-gradient flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8">
        <div className="text-center space-y-6 mb-8">
          <div className="mx-auto w-16 h-16 bg-[#185e46] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#185e46]/20">
            <Stethoscope size={32} />
          </div>
          <h1 className="text-3xl font-serif text-[#185e46] leading-tight">Priprema za pregled</h1>
          <p className="text-gray-600 text-lg">
            Molimo vas da unesete vaš datum rođenja kako bismo potvrdili vaš identitet i pristupili upitniku.
          </p>
        </div>

        <div className="bg-green-50 text-green-800 p-4 rounded-xl mb-8 flex items-start gap-3 text-sm">
          <ShieldCheck className="shrink-0 mt-0.5" />
          <p>Vaši podaci su zaštićeni u skladu sa najvišim medicinskim standardima privatnosti.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 text-base">Datum rođenja</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="npr. 1980-05-15" 
                      className="text-lg py-6 bg-gray-50 border-gray-200 focus:border-[#185e46] focus:ring-[#185e46]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full text-lg py-6 bg-[#185e46] hover:bg-[#124a37] text-white rounded-xl"
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? 'Proveravam...' : 'Nastavi'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
