import { ObjectId } from 'mongodb';

/**
 * Exercise Media
 */
export interface ExerciseMedia {
  type: 'youtube';
  url: string;
}

/**
 * Exercise
 * Represents a single exercise in the library
 */
export interface Exercise {
  _id?: ObjectId;
  name: string;
  aliases: string[];
  media: ExerciseMedia[];
  requiredEquipment: string[];
  targetArea: string[];
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isTimeBased: boolean;
  exerciseType?: 'strength' | 'flexibility';
  created_at: Date;
  updated_at: Date;
}

/**
 * Program Exercise
 * Configuration for an exercise within a workout program
 */
export interface ProgramExercise {
  exercise_id: ObjectId;
  order: number;
  sets?: number;
  reps?: number;
  duration_seconds?: number;
  notes?: string;
}

/**
 * Workout Program
 * A structured sequence of exercises
 */
export interface WorkoutProgram {
  _id?: ObjectId;
  name: string;
  description: string;
  exercises: ProgramExercise[];
  status: 'active' | 'archived';
  created_at: Date;
  updated_at: Date;
}

/**
 * Populated Program Exercise
 * Program exercise with full exercise details populated
 */
export interface PopulatedProgramExercise extends ProgramExercise {
  exercise: Exercise;
}

/**
 * Populated Workout Program
 * Program with full exercise details populated
 */
export interface PopulatedWorkoutProgram extends Omit<WorkoutProgram, 'exercises'> {
  exercises: PopulatedProgramExercise[];
}
