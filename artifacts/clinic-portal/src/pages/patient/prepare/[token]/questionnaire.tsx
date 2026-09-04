import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import {
  getGetQuestionnaireQueryKey,
  useGetQuestionnaire,
  useSaveQuestionnaire,
  useSubmitQuestionnaire,
} from '@workspace/api-client-react';
import type { QuestionnaireRecordAnswers } from '@workspace/api-client-react';
import { ChevronLeft, ChevronRight, FileText, Plus, Save, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { usePatientAuth } from '@/hooks/use-patient-auth';
import { useToast } from '@/hooks/use-toast';

type QuestionType = 'single_choice' | 'multi_choice' | 'free_text' | 'medication_list' | 'boolean' | 'date';
type Medication = { name: string; dose: string; frequency: string; status?: 'confirmed' | 'unsure' };
type AnswerValue = string | boolean | string[] | Medication[] | undefined;
type Answers = Record<string, AnswerValue>;

type Question = {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
  conditional?: { parentQuestionId: string; showWhen: string | string[] };
};

const SECTIONS: Array<{ id: string; title: string; questions: Question[] }> = [
  {
    id: 'stable_profile',
    title: 'Lični podaci (proverite tačnost)',
    questions: [
      { id: 'full_name', type: 'free_text', label: 'Ime i prezime', required: true, hint: 'Ovi podaci pomažu da doktor poveže pripremu sa vašim pregledom.' },
      { id: 'date_of_birth', type: 'date', label: 'Datum rođenja', required: true },
      { id: 'sex', type: 'single_choice', label: 'Pol', required: false, options: [
        { value: 'male', label: 'Muški' }, { value: 'female', label: 'Ženski' }, { value: 'other', label: 'Drugo' }, { value: 'prefer_not_to_say', label: 'Ne želim da navedem' },
      ] },
      { id: 'height_cm', type: 'free_text', label: 'Visina (cm)', required: false, hint: 'Npr. 170' },
    ],
  },
  {
    id: 'main_complaint',
    title: 'Razlog posete',
    questions: [
      { id: 'symptoms', type: 'free_text', label: 'Opišite vaše glavne tegobe', required: false, hint: 'Možete navesti zamor, promene raspoloženja ili telesne mase, pospanost, gubitak kose, suvu kožu ili otoke.' },
    ],
  },
  {
    id: 'thyroid_history',
    title: 'Istorija bolesti štitaste žlezde',
    questions: [
      { id: 'has_thyroid_diagnosis', type: 'boolean', label: 'Da li vam je ranije dijagnostikovana bolest štitaste žlezde?', required: false },
      { id: 'diagnosis_history', type: 'free_text', label: 'Kada je dijagnoza postavljena i o kojoj bolesti se radi?', required: false, conditional: { parentQuestionId: 'has_thyroid_diagnosis', showWhen: 'true' } },
      { id: 'has_ultrasound', type: 'boolean', label: 'Da li ste ikada radili ultrazvuk štitaste žlezde?', required: false },
      { id: 'ultrasound_findings', type: 'free_text', label: 'Šta je pronađeno (čvorići, ciste, nešto drugo)?', required: false, conditional: { parentQuestionId: 'has_ultrasound', showWhen: 'true' } },
    ],
  },
  {
    id: 'current_therapy',
    title: 'Terapija koju uzimate',
    questions: [
      { id: 'current_thyroid_therapy', type: 'medication_list', label: 'Terapija za štitastu žlezdu', required: false, hint: 'Dodajte svaki lek, dozu i učestalost. Ako niste sigurni, označite to za doktora.' },
      { id: 'other_medications', type: 'medication_list', label: 'Ostali lekovi i dodaci ishrani', required: false },
    ],
  },
  {
    id: 'additional_symptoms',
    title: 'Dodatni simptomi',
    questions: [
      { id: 'cardiac_symptoms', type: 'boolean', label: 'Da li imate lupanje ili preskakanje srca, gušenje, vrtoglavicu ili kratke epizode gubitka svesti?', required: false },
      { id: 'musculoskeletal_symptoms', type: 'boolean', label: 'Da li imate bolove u kostima, zglobovima ili mišićima?', required: false },
    ],
  },
  {
    id: 'allergies',
    title: 'Alergije',
    questions: [
      { id: 'has_allergies', type: 'boolean', label: 'Da li imate poznate alergije na hranu ili lekove?', required: false },
      { id: 'allergies_list', type: 'free_text', label: 'Navedite alergene', required: false, conditional: { parentQuestionId: 'has_allergies', showWhen: 'true' } },
    ],
  },
  {
    id: 'lifestyle',
    title: 'Navike',
    questions: [
      { id: 'smoking', type: 'single_choice', label: 'Pušenje', required: false, options: [
        { value: 'non_smoker', label: 'Ne pušim' }, { value: 'smoker', label: 'Pušim' }, { value: 'ex_smoker', label: 'Bivši pušač' }, { value: 'prefer_not_to_say', label: 'Ne želim da navedem' },
      ] },
      { id: 'alcohol', type: 'single_choice', label: 'Alkohol', required: false, options: [
        { value: 'none', label: 'Ne konzumiram' }, { value: 'occasional', label: 'Povremeno' }, { value: 'regular', label: 'Redovno' }, { value: 'prefer_not_to_say', label: 'Ne želim da navedem' },
      ] },
    ],
  },
  {
    id: 'medical_history',
    title: 'Lična i porodična anamneza',
    questions: [
      { id: 'other_conditions', type: 'free_text', label: 'Ostale dijagnoze (dijabetes, srčane bolesti, hipertenzija i sl.)', required: false },
      { id: 'surgical_history', type: 'free_text', label: 'Operacije (koje i kada, ako je primenljivo)', required: false },
      { id: 'has_family_history', type: 'boolean', label: 'Da li u porodici postoji dijabetes, srčana bolest, infarkt, šlog ili maligna bolest?', required: false },
      { id: 'family_history_details', type: 'free_text', label: 'Navedite ko i šta', required: false, conditional: { parentQuestionId: 'has_family_history', showWhen: 'true' } },
    ],
  },
  {
    id: 'preferences',
    title: 'Vaše preference (opciono)',
    questions: [
      { id: 'communication_channel', type: 'single_choice', label: 'Preferirani kanal za obaveštenja', required: false, options: [
        { value: 'viber', label: 'Viber' }, { value: 'sms', label: 'SMS' }, { value: 'email', label: 'Email' },
      ] },
      { id: 'needs_prep_guidance', type: 'boolean', label: 'Da li želite uputstvo šta da donesete na pregled?', required: false },
      { id: 'needs_digital_help', type: 'boolean', label: 'Da li vam je potrebna pomoć sa ovim formularom?', required: false },
      { id: 'document_preference', type: 'single_choice', label: 'Donosite li nalaze digitalno ili fizički?', required: false, options: [
        { value: 'digital', label: 'Digitalno (fajl)' }, { value: 'physical', label: 'Fizički primerak' }, { value: 'both', label: 'I jedno i drugo' },
      ] },
    ],
  },
];

function normaliseAnswers(raw: QuestionnaireRecordAnswers | undefined): Answers {
  if (!raw) return {};
  const sectionIds = new Set(SECTIONS.map((section) => section.id));
  const hasSectionShape = Object.keys(raw).some((key) => sectionIds.has(key));
  if (!hasSectionShape) return raw as Answers;
  return Object.entries(raw).reduce<Answers>((result, [key, value]) => {
    if (sectionIds.has(key) && value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, value);
    } else {
      result[key] = value as AnswerValue;
    }
    return result;
  }, {});
}

function isVisible(question: Question, answers: Answers) {
  if (!question.conditional) return true;
  const parent = answers[question.conditional.parentQuestionId];
  const expected = question.conditional.showWhen;
  return Array.isArray(expected) ? expected.includes(String(parent)) : String(parent) === expected;
}

function emptyMedication(): Medication {
  return { name: '', dose: '', frequency: '', status: 'confirmed' };
}

export default function PrepareQuestionnaire() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { appointmentId } = usePatientAuth();
  const { toast } = useToast();
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const initialised = useRef(false);
  const { data, isLoading } = useGetQuestionnaire(appointmentId || '', {
    query: { enabled: !!appointmentId, queryKey: getGetQuestionnaireQueryKey(appointmentId || ''), retry: false },
  });
  const saveMutation = useSaveQuestionnaire();
  const submitMutation = useSubmitQuestionnaire();
  const section = SECTIONS[sectionIndex];

  useEffect(() => {
    if (data?.questionnaire?.answers && !initialised.current) {
      setAnswers(normaliseAnswers(data.questionnaire.answers));
      initialised.current = true;
    }
  }, [data]);

  const setAnswer = (id: string, value: AnswerValue) => setAnswers((current) => ({ ...current, [id]: value }));
  const getValue = (id: string) => answers[id];
  const visibleQuestions = useMemo(() => section.questions.filter((question) => isVisible(question, answers)), [section, answers]);

  const save = async () => {
    if (!appointmentId) return false;
    try {
      await saveMutation.mutateAsync({ appointmentId, data: { answers } });
      return true;
    } catch {
      toast({ title: 'Nije moguće sačuvati odgovore', description: 'Proverite vezu i pokušajte ponovo.', variant: 'destructive' });
      return false;
    }
  };

  const next = async () => {
    if (!(await save())) return;
    if (sectionIndex < SECTIONS.length - 1) {
      setSectionIndex((index) => index + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!appointmentId) return;
    submitMutation.mutate({ appointmentId, data: { answers } }, {
      onSuccess: () => setLocation(`/prepare/${token}/documents`),
      onError: () => toast({ title: 'Greška pri slanju', description: 'Odgovori nisu poslati. Pokušajte ponovo.', variant: 'destructive' }),
    });
  };

  const previous = async () => {
    if (!(await save())) return;
    setSectionIndex((index) => Math.max(0, index - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderMedicationList = (question: Question) => {
    const medications = (getValue(question.id) as Medication[] | undefined) ?? [];
    const updateMedication = (index: number, patch: Partial<Medication>) => {
      setAnswer(question.id, medications.map((medication, medicationIndex) => medicationIndex === index ? { ...medication, ...patch } : medication));
    };
    return (
      <div className="space-y-3">
        {medications.map((medication, index) => (
          <div key={`${question.id}-${index}`} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input aria-label="Naziv leka" placeholder="Naziv leka" value={medication.name} onChange={(event) => updateMedication(index, { name: event.target.value })} />
              <Input aria-label="Doza" placeholder="Doza (npr. 50 µg)" value={medication.dose} onChange={(event) => updateMedication(index, { dose: event.target.value })} />
              <Input aria-label="Učestalost" placeholder="Učestalost" value={medication.frequency} onChange={(event) => updateMedication(index, { frequency: event.target.value })} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={medication.status === 'confirmed' ? 'default' : 'outline'} onClick={() => updateMedication(index, { status: 'confirmed' })}>Potvrđujem</Button>
                <Button type="button" size="sm" variant={medication.status === 'unsure' ? 'secondary' : 'outline'} onClick={() => updateMedication(index, { status: 'unsure' })}>Nisam siguran/na</Button>
              </div>
              <Button type="button" size="sm" variant="ghost" className="text-rose-700" onClick={() => setAnswer(question.id, medications.filter((_, medicationIndex) => medicationIndex !== index))}><Trash2 size={14} className="mr-1" /> Ukloni</Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => setAnswer(question.id, [...medications, emptyMedication()])}><Plus size={16} className="mr-2" /> Dodaj lek</Button>
      </div>
    );
  };

  const renderQuestion = (question: Question) => {
    const value = getValue(question.id);
    return (
      <div key={question.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <Label className="text-base leading-6 text-stone-900">{question.label}{question.required && <span className="text-rose-600"> *</span>}</Label>
        {question.hint && <p className="mt-2 text-sm leading-5 text-stone-500">{question.hint}</p>}
        <div className="mt-4">
          {question.type === 'free_text' && <Textarea value={typeof value === 'string' ? value : ''} onChange={(event) => setAnswer(question.id, event.target.value)} rows={4} placeholder="Unesite odgovor" />}
          {question.type === 'date' && <Input type="date" value={typeof value === 'string' ? value : ''} onChange={(event) => setAnswer(question.id, event.target.value)} className="max-w-xs" />}
          {question.type === 'boolean' && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-stone-500">Ne</span>
              <Switch checked={value === true} onCheckedChange={(checked) => setAnswer(question.id, checked)} />
              <span className="text-sm font-medium text-stone-800">Da</span>
            </div>
          )}
          {question.type === 'single_choice' && question.options && (
            <RadioGroup value={typeof value === 'string' ? value : ''} onValueChange={(nextValue) => setAnswer(question.id, nextValue)} className="grid gap-3 sm:grid-cols-2">
              {question.options.map((option) => <div key={option.value} className="flex items-center gap-3 rounded-xl border border-stone-200 px-4 py-3"><RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} /><Label htmlFor={`${question.id}-${option.value}`} className="cursor-pointer font-normal">{option.label}</Label></div>)}
            </RadioGroup>
          )}
          {question.type === 'multi_choice' && question.options && (
            <div className="grid gap-3 sm:grid-cols-2">
              {question.options.map((option) => {
                const selectedValues = Array.isArray(value) && value.every((item): item is string => typeof item === 'string') ? value : [];
                const selected = selectedValues.includes(option.value);
                return <div key={option.value} className="flex items-center gap-3 rounded-xl border border-stone-200 px-4 py-3"><Checkbox id={`${question.id}-${option.value}`} checked={selected} onCheckedChange={(checked) => setAnswer(question.id, checked ? [...selectedValues, option.value] : selectedValues.filter((item) => item !== option.value))} /><Label htmlFor={`${question.id}-${option.value}`} className="cursor-pointer font-normal">{option.label}</Label></div>;
              })}
            </div>
          )}
          {question.type === 'medication_list' && renderMedicationList(question)}
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="min-h-screen bg-stone-50 p-4 pt-12"><div className="mx-auto max-w-3xl"><Skeleton className="h-[520px] w-full rounded-3xl" /></div></div>;
  if (data?.isLocked) return <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4"><Card className="max-w-md p-8 text-center"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-700">!</div><h2 className="font-serif text-2xl text-stone-900">Upitnik je zaključan</h2><p className="mt-3 text-stone-600">Vreme pregleda je počelo. Ako nešto važno treba ispraviti, obratite se klinici.</p><Button className="mt-6 w-full bg-[#185e46]" onClick={() => setLocation(`/prepare/${token}/documents`)}>Nastavi na dokumenta</Button></Card></div>;

  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-serif font-medium text-[#185e46]"><FileText size={19} /> Priprema za pregled</div>
          <span className="text-sm text-stone-500">Korak {sectionIndex + 1} od {SECTIONS.length}</span>
        </div>
        <div className="h-1 bg-stone-100"><div className="h-full bg-[#185e46] transition-all" style={{ width: `${((sectionIndex + 1) / SECTIONS.length) * 100}%` }} /></div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-8">
        <div className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#185e46]">Podaci za doktora</p>
          <h1 className="mt-2 font-serif text-3xl text-stone-900">{section.title}</h1>
          <p className="mt-3 text-stone-600">Odgovori su vaši lični navodi i pomažu doktoru da se pripremi. Upitnik ne zamenjuje pregled.</p>
        </div>
        <div className="space-y-4">{visibleQuestions.map(renderQuestion)}</div>
      </main>
      <footer className="fixed bottom-0 z-10 w-full border-t border-stone-200 bg-white/95 p-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.18)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Button variant="outline" onClick={previous} disabled={sectionIndex === 0 || saveMutation.isPending}><ChevronLeft size={18} className="mr-1" /> Nazad</Button>
          <Button variant="ghost" onClick={save} disabled={saveMutation.isPending} className="hidden text-stone-600 sm:flex"><Save size={17} className="mr-2" /> Sačuvaj nacrt</Button>
          <Button onClick={next} disabled={saveMutation.isPending || submitMutation.isPending} className="bg-[#185e46] px-6 hover:bg-[#124a37]">{sectionIndex === SECTIONS.length - 1 ? (submitMutation.isPending ? 'Slanje...' : 'Završi i pošalji') : 'Dalje'}{sectionIndex !== SECTIONS.length - 1 && <ChevronRight size={18} className="ml-1" />}</Button>
        </div>
      </footer>
    </div>
  );
}