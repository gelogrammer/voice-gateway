export type RecordingCategory =
  | 'HIGH_FLUENCY'
  | 'MEDIUM_FLUENCY'
  | 'LOW_FLUENCY'
  | 'CLEAR_PRONUNCIATION'
  | 'UNCLEAR_PRONUNCIATION'
  | 'FAST_TEMPO'
  | 'MEDIUM_TEMPO'
  | 'SLOW_TEMPO';

export interface UserProfile {
  full_name: string;
  email: string;
}

export interface Recording {
  id: string;
  user_id: string;
  file_url: string;
  duration: number;
  title: string;
  script_text: string;
  category: RecordingCategory;
  file_size: number;
  mime_type: string;
  is_processed: boolean;
  waveform_data?: any;
  transcription?: string;
  created_at: string;
  updated_at: string;
  profiles?: UserProfile[];
} 