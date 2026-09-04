import { useLocation, useParams } from 'wouter';
import { usePatientAuth } from '@/hooks/use-patient-auth';
import { useRecordConsent } from '@workspace/api-client-react';

import { Button } from '@/components/ui/button';
import { CheckCircle, ShieldAlert } from 'lucide-react';

export default function PrepareConsent() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { appointmentId } = usePatientAuth();
  const consentMutation = useRecordConsent();

  const handleAccept = () => {
    if (!appointmentId) return;
    consentMutation.mutate({ appointmentId }, {
      onSuccess: () => {
        setLocation(`/prepare/${token}/questionnaire`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-patient-portal-gradient flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-2xl font-serif text-gray-900">Saglasnost i Privatnost</h1>
        </div>

        <div className="prose prose-green max-w-none text-gray-600 mb-8 space-y-4">
          <p>
            Da bismo vam pružili najbolju moguću medicinsku negu, molimo vas da popunite ovaj pripremni upitnik. Vaši odgovori će pomoći doktoru da se unapred upozna sa vašim stanjem.
          </p>
          <ul className="space-y-2 list-none pl-0">
            <li className="flex items-start gap-2">
              <CheckCircle className="text-[#185e46] mt-1 shrink-0" size={18} />
              <span>Svi vaši podaci se čuvaju u strogo kontrolisanom okruženju i zaštićeni su medicinskom tajnom.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="text-[#185e46] mt-1 shrink-0" size={18} />
              <span>Samo vaš doktor i ovlašćeno medicinsko osoblje imaju pristup ovim informacijama.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="text-[#185e46] mt-1 shrink-0" size={18} />
              <span>Podatke možete ažurirati u svakom trenutku pre posete klinici.</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
          <Button 
            className="flex-1 text-lg py-6 bg-[#185e46] hover:bg-[#124a37] text-white rounded-xl"
            onClick={handleAccept}
            disabled={consentMutation.isPending}
          >
            Razumem i prihvatam
          </Button>
        </div>
      </div>
    </div>
  );
}
