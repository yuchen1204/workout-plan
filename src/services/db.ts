import { openDB, IDBPDatabase } from 'idb';
import { TrainingProgram, WorkoutLog } from './types';

const DB_NAME = 'fittrack_db';
const DB_VERSION = 1;

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('programs')) {
        db.createObjectStore('programs', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('logs')) {
        db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function saveProgram(program: TrainingProgram) {
  const db = await initDB();
  return db.add('programs', program);
}

export async function getPrograms(): Promise<TrainingProgram[]> {
  const db = await initDB();
  return db.getAll('programs');
}

export async function getActiveProgram(): Promise<TrainingProgram | null> {
  const programs = await getPrograms();
  return programs.length > 0 ? programs[programs.length - 1] : null;
}

export async function saveWorkoutLog(log: WorkoutLog) {
  const db = await initDB();
  return db.add('logs', log);
}

export async function getWorkoutLogs(): Promise<WorkoutLog[]> {
  const db = await initDB();
  return db.getAll('logs');
}

export async function clearAllData() {
  const db = await initDB();
  const tx = db.transaction(['programs', 'logs'], 'readwrite');
  await tx.objectStore('programs').clear();
  await tx.objectStore('logs').clear();
  await tx.done;
}
