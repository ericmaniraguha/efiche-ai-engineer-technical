export interface AIVerification {
  dangerous_flags?: string[];
  unsupported_claims?: string[];
}

export interface ClinicalData {
  diagnosis?: string;
  medications?: string | string[];
  chief_complaint?: string;
  follow_up?: string;
  ai_verification?: AIVerification;
}

export interface MockConsultation {
  id: string;
  patient_init: string;
  status: string;
  date: string;
  wer_score: number;
  clinical_score: number;
  diagnosis: string;
  meds: string[];
  created_at?: string;
  clinical_data?: ClinicalData;
}

export const MOCK_CONSULTATIONS: MockConsultation[] = [
  {
    id: "CONS-2024-001",
    patient_init: "J.D.",
    status: "complete",
    date: "2024-04-26 10:30",
    wer_score: 0.08,
    clinical_score: 0.95,
    diagnosis: "Acute Bronchitis",
    meds: ["Amoxicillin 500mg", "Albuterol inhaler"],
    clinical_data: {
      diagnosis: "Acute Bronchitis",
      medications: ["Amoxicillin 500mg", "Albuterol inhaler"],
      chief_complaint: "Persistent cough and chest congestion"
    }
  },
  {
    id: "CONS-2024-002",
    patient_init: "M.S.",
    status: "needs_review",
    date: "2024-04-26 11:15",
    wer_score: 0.15,
    clinical_score: 0.72,
    diagnosis: "Unspecified Hypertension",
    meds: ["Lisinopril 10mg", "Wait for lab results"],
    clinical_data: {
      diagnosis: "Unspecified Hypertension",
      medications: ["Lisinopril 10mg"],
      chief_complaint: "Elevated blood pressure reading at home"
    }
  },
  {
    id: "CONS-2024-003",
    patient_init: "R.K.",
    status: "complete",
    date: "2024-04-26 09:45",
    wer_score: 0.05,
    clinical_score: 0.98,
    diagnosis: "Type 2 Diabetes Mellitus",
    meds: ["Metformin 1000mg", "Glipizide 5mg"],
    clinical_data: {
      diagnosis: "Type 2 Diabetes Mellitus",
      medications: ["Metformin 1000mg", "Glipizide 5mg"],
      chief_complaint: "Routine follow-up for blood sugar management"
    }
  }
];
