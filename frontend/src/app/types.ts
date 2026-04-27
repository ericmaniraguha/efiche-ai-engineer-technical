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

export interface Consultation {
  id: string;
  status: string;
  diagnosis?: string;
  meds?: string[];
  created_at: string;
  raw_transcript?: string;
  clinical_data?: ClinicalData;
  wer_score?: number;
  clinical_score?: number;
  // Legacy fields from mock data to ensure backward compatibility
  patient_init?: string;
  date?: string;
}

export interface EditData {
  diagnosis: string;
  medications: string;
  chief_complaint: string;
  follow_up: string;
}
