import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { usePatientAuth } from '@/hooks/use-patient-auth';
import { getGetQuestionnaireQueryKey, getListDocumentsQueryKey, useGetQuestionnaire, useListDocuments, useUpdateLabStatus, useUploadDocument } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { FileUp, File as FileIcon, CheckCircle2, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function PrepareDocuments() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { appointmentId } = usePatientAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: questionnaireState } = useGetQuestionnaire(appointmentId || '', {
    query: { enabled: !!appointmentId, queryKey: getGetQuestionnaireQueryKey(appointmentId || '') },
  });
  const [labStatus, setLabStatus] = useState('');

  const { data: documentsData, isLoading } = useListDocuments(appointmentId || '', {
    query: {
      enabled: !!appointmentId,
      queryKey: getListDocumentsQueryKey(appointmentId || '')
    }
  });

  const uploadMutation = useUploadDocument();
  const labStatusMutation = useUpdateLabStatus();
  const [isSimulatingUpload, setIsSimulatingUpload] = useState(false);

  const statusOptions = [
    { value: 'uploaded_digitally', label: 'Imam nalaze i upravo ću ih dodati digitalno' },
    { value: 'will_bring_physical', label: 'Doneću fizičke nalaze na pregled' },
    { value: 'results_pending', label: 'Nalazi su u izradi / još nisu spremni' },
    { value: 'no_results_available', label: 'Nemam dostupne nalaze' },
    { value: 'not_required', label: 'Za ovaj pregled nisu potrebni' },
  ];

  useEffect(() => {
    if (!labStatus && questionnaireState?.appointment.labStatus) setLabStatus(questionnaireState.appointment.labStatus);
  }, [labStatus, questionnaireState?.appointment.labStatus]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appointmentId) return;

    setIsSimulatingUpload(true);
    
    // Simulate upload progress
    setTimeout(() => {
      uploadMutation.mutate({
        appointmentId,
        data: {
          originalFileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSizeBytes: file.size,
          documentType: 'lab_result',
          labStatus: 'uploaded_digitally',
        }
      }, {
        onSuccess: () => {
          toast({ title: 'Dokument uspešno dodat' });
          setLabStatus('uploaded_digitally');
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(appointmentId) });
          setIsSimulatingUpload(false);
        },
        onError: () => {
          toast({ title: 'Greška', variant: 'destructive' });
          setIsSimulatingUpload(false);
        }
      });
    }, 1000);
  };

  const saveLabStatus = (value: string) => {
    if (!appointmentId) return;
    setLabStatus(value);
    labStatusMutation.mutate({ appointmentId, data: { labStatus: value as 'uploaded_digitally' | 'will_bring_physical' | 'results_pending' | 'no_results_available' | 'not_required' } }, {
      onError: () => toast({ title: 'Status nije sačuvan', description: 'Pokušajte ponovo.', variant: 'destructive' }),
    });
  };

  const handleFinish = () => {
    setLocation(`/prepare/${token}/done`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 pt-8">
      <main className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-serif text-[#185e46] mb-3">Prethodni nalazi</h2>
          <p className="text-gray-600 text-lg">
            Ukoliko imate novije laboratorijske nalaze, ultrazvuk ili izveštaje lekara, možete ih priložiti ovde. Opciono je, ali veoma korisno za doktora.
          </p>
        </div>

        <div className="mb-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">Status laboratorijskih nalaza</h3>
          <p className="mt-2 text-sm leading-6 text-stone-600">Ako ne dodajete fajl, izaberite opciju koja najtačnije opisuje vašu situaciju. Ovo ne blokira završetak pripreme.</p>
          <div className="mt-4 space-y-3">
            {statusOptions.map((option) => (
              <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${labStatus === option.value ? 'border-[#185e46] bg-emerald-50' : 'border-stone-200 hover:bg-stone-50'}`}>
                <input type="radio" name="labStatus" value={option.value} checked={labStatus === option.value} onChange={(event) => saveLabStatus(event.target.value)} className="mt-1 h-4 w-4 accent-[#185e46]" />
                <span className="text-sm leading-5 text-stone-800">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white border-2 border-dashed border-[#185e46]/20 rounded-3xl p-8 text-center mb-8 hover:bg-[#185e46]/5 transition-colors relative">
          <input 
            type="file" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            onChange={handleFileUpload}
            disabled={isSimulatingUpload || uploadMutation.isPending}
            accept=".pdf,.jpg,.jpeg,.png"
          />
          <div className="w-16 h-16 bg-[#185e46]/10 text-[#185e46] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileUp size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Dodirnite da dodate dokument</h3>
          <p className="text-sm text-gray-500">PDF, JPG, PNG (maksimalno 10MB)</p>
          
          {(isSimulatingUpload || uploadMutation.isPending) && (
            <div className="mt-4 flex items-center justify-center gap-2 text-[#185e46]">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
              <span>Otpremanje...</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-gray-900 px-2">Dodati dokumenti</h3>
          
          {isLoading ? (
            <Skeleton className="h-20 w-full rounded-2xl" />
          ) : documentsData && documentsData.length > 0 ? (
            documentsData.map(doc => (
              <div key={doc.id} className="bg-white p-4 rounded-2xl border flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <FileIcon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{doc.originalFileName}</p>
                  <p className="text-sm text-gray-500">{(doc.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <CheckCircle2 className="text-green-500 shrink-0" size={24} />
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-gray-100">
              Još niste dodali nijedan dokument.
            </div>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 w-full bg-white border-t p-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <div className="max-w-2xl mx-auto flex justify-end">
          <Button onClick={handleFinish} className="bg-[#185e46] hover:bg-[#124a37] rounded-xl px-8 py-6 text-lg w-full sm:w-auto">
            Završi pripremu <ChevronRight size={20} className="ml-2" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
