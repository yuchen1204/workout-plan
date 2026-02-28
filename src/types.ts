export type ExerciseType = 'hold_seconds' | 'reps' | 'hold_seconds_each_side' | 'reps_each_side';

export interface ExerciseDefinition {
  type: ExerciseType;
  rest_s: number;
  time_limit_s?: number;
  description?: string;
  gif_url?: string;
}

export interface PrescriptionItem {
  name: string;
  sets: number;
  reps?: number;
  hold_seconds?: number;
  reps_each_side?: number;
  hold_seconds_each_side?: number;
  weight_kg?: number;
  distance_m?: number;
}

export interface WeekPrescription {
  week: number;
  day_prescription?: {
    [key: string]: PrescriptionItem[];
  };
  delta_from_previous_week?: {
    [key: string]: string; // e.g., "+5", "-2"
  };
}

export interface TrainingProgram {
  id?: number;
  program_name: string;
  duration_weeks: number;
  goal_priority: string[];
  session_structure: {
    main_minutes: number;
  };
  exercise_library: {
    [key: string]: ExerciseDefinition;
  };
  weekly_targets: WeekPrescription[];
}

export interface WorkoutLog {
  id?: number;
  programId: number;
  date: string; // ISO string
  week: number;
  day: string;
  exercises: {
    name: string;
    sets: {
      completed: boolean;
      value: number; // primary value (reps or seconds)
      weight_kg?: number;
      distance_m?: number;
      timestamp: string;
    }[];
  }[];
  totalDurationSeconds: number;
  completed: boolean;
}
