export interface MockConsultation {
  id: string;
  patient_init: string;
  status: 'complete' | 'needs_review' | 'failed';
  date: string;
  wer: number;
  clinical_score: number;
  diagnosis: string;
  meds: string[];
}

export const MOCK_CONSULTATIONS: MockConsultation[] = [
  {
    id: "CONS-2024-001",
    patient_init: "J.D.",
    status: "complete",
    date: "2024-04-26 10:30",
    wer: 0.08,
    clinical_score: 0.95,
    diagnosis: "Acute Bronchitis",
    meds: ["Amoxicillin 500mg", "Albuterol inhaler"]
  },
  {
    id: "CONS-2024-002",
    patient_init: "M.S.",
    status: "needs_review",
    date: "2024-04-26 11:15",
    wer: 0.15,
    clinical_score: 0.72,
    diagnosis: "Unspecified Hypertension",
    meds: ["Lisinopril 10mg", "Wait for lab results"]
  },
  {
    id: "CONS-2024-003",
    patient_init: "R.K.",
    status: "complete",
    date: "2024-04-26 09:45",
    wer: 0.05,
    clinical_score: 0.98,
    diagnosis: "Type 2 Diabetes Mellitus",
    meds: ["Metformin 1000mg", "Glipizide 5mg"]
  }
];
