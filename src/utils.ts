import { TrainingProgram, PrescriptionItem, WeekPrescription } from './types';

export function calculatePrescriptionForWeek(
  program: TrainingProgram,
  targetWeek: number
): { [key: string]: PrescriptionItem[] } {
  // Find the base prescription (the last one that has day_prescription)
  let currentPrescription: { [key: string]: PrescriptionItem[] } = {};
  
  for (let w = 1; w <= targetWeek; w++) {
    const weekData = program.weekly_targets.find((t) => t.week === w);
    if (!weekData) continue;

    if (weekData.day_prescription) {
      currentPrescription = JSON.parse(JSON.stringify(weekData.day_prescription));
    } else if (weekData.delta_from_previous_week) {
      // Apply deltas to all days in currentPrescription
      const deltas = weekData.delta_from_previous_week;
      for (const day in currentPrescription) {
        currentPrescription[day] = currentPrescription[day].map((item) => {
          const newItem = { ...item };
          
          // Check for specific deltas like "plank_hold_seconds" or "push_up_reps"
          for (const deltaKey in deltas) {
            const lastUnderscoreIndex = deltaKey.lastIndexOf('_');
            const exerciseName = deltaKey.substring(0, lastUnderscoreIndex);
            
            if (newItem.name === exerciseName) {
              const deltaValue = parseInt(deltas[deltaKey]);
              if (deltaKey.endsWith('_reps')) {
                newItem.reps = (newItem.reps || 0) + deltaValue;
              } else if (deltaKey.endsWith('_hold_seconds')) {
                newItem.hold_seconds = (newItem.hold_seconds || 0) + deltaValue;
              } else if (deltaKey.endsWith('_reps_each_side')) {
                newItem.reps_each_side = (newItem.reps_each_side || 0) + deltaValue;
              } else if (deltaKey.endsWith('_hold_seconds_each_side')) {
                newItem.hold_seconds_each_side = (newItem.hold_seconds_each_side || 0) + deltaValue;
              } else if (deltaKey.endsWith('_sets')) {
                newItem.sets = (newItem.sets || 0) + deltaValue;
              }
            }
          }
          return newItem;
        });
      }
    }
  }

  return currentPrescription;
}

export function formatExerciseTarget(ex: PrescriptionItem): string {
  if (ex.reps !== undefined) return `${ex.reps}`;
  if (ex.reps_each_side !== undefined) return `${ex.reps_each_side} (each)`;
  if (ex.hold_seconds !== undefined) return `${ex.hold_seconds}s`;
  if (ex.hold_seconds_each_side !== undefined) return `${ex.hold_seconds_each_side}s (each)`;
  return '0';
}

export function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const SOUNDS = {
  SUCCESS: 'https://cdn.pixabay.com/audio/2022/03/15/audio_7833327c4b.mp3', // Workout complete
  BEEP: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3',    // Rest end
  NOTIFICATION: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c35025993a.mp3', // Set complete
  START: 'https://cdn.pixabay.com/audio/2024/02/08/audio_82330a6397.mp3',   // Set start
  TICK: 'https://cdn.pixabay.com/audio/2022/03/24/audio_7392667995.mp3'     // Countdown tick
};

export function playSound(type: keyof typeof SOUNDS) {
  const audio = new Audio(SOUNDS[type]);
  audio.play().catch(e => console.log('Audio playback blocked:', e));
}
