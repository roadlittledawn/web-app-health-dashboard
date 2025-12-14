import { ObjectId } from 'mongodb';

export interface LabMeasurement {
  value: number;
  unit: string;
  reference_range: { min: number; max: number };
  flag?: 'high' | 'low' | 'normal';
}

export interface CustomLabResult {
  test_name: string;
  value: number | string;
  unit?: string;
  reference_range?: { min?: number; max?: number };
  flag?: 'high' | 'low' | 'normal' | 'critical';
}

export interface LabResult {
  _id?: ObjectId;
  test_date: Date;
  test_type: string;            // 'lipid_panel', 'metabolic', 'custom', etc.
  ordered_by: string;           // Doctor/provider name
  lab_name?: string;            // Lab facility name

  // Lipid Panel Specific Fields
  total_cholesterol?: LabMeasurement;
  ldl_cholesterol?: LabMeasurement;
  hdl_cholesterol?: LabMeasurement;
  triglycerides?: LabMeasurement;

  // Flexible custom fields for any lab test
  custom_results?: CustomLabResult[];

  notes?: string;               // Doctor notes or observations
  created_at: Date;
  updated_at: Date;
}

export interface LabTrend {
  date: Date;
  total_cholesterol?: number;
  ldl_cholesterol?: number;
  hdl_cholesterol?: number;
  triglycerides?: number;
}
