/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Play, 
  History as HistoryIcon, 
  LayoutDashboard, 
  Upload, 
  CheckCircle2, 
  Timer, 
  ChevronRight,
  X,
  AlertCircle,
  Clock,
  Flame,
  Target,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TrainingProgram, WorkoutLog, PrescriptionItem } from './types';
import { getActiveProgram, saveProgram, getWorkoutLogs, saveWorkoutLog, clearAllData } from './services/db';
import { calculatePrescriptionForWeek, formatSeconds, playSound } from './utils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  disabled 
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  disabled?: boolean;
}) => {
  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
    ghost: "bg-transparent text-zinc-500 hover:bg-zinc-100"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
  const [program, setProgram] = useState<TrainingProgram | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<{
    week: number;
    day: string;
    exercises: PrescriptionItem[];
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const p = await getActiveProgram();
    const l = await getWorkoutLogs();
    setProgram(p);
    setLogs(l);
  };

  const handleImport = async (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString) as TrainingProgram;
      await saveProgram(parsed);
      await loadData();
      setIsImporting(false);
    } catch (e) {
      alert("Invalid JSON format. Please check your file.");
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleImport(content);
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      await clearAllData();
      setProgram(null);
      setLogs([]);
    }
  };

  const startWorkout = (week: number, day: string, exercises: PrescriptionItem[]) => {
    setActiveWorkout({ week, day, exercises });
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-6 py-3 z-50 md:top-0 md:bottom-auto md:border-t-0 md:border-b">
        <div className="max-w-4xl mx-auto flex justify-around md:justify-start md:gap-8">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex flex-col items-center gap-1 md:flex-row md:gap-2 px-3 py-1 rounded-lg transition-colors",
              activeTab === 'dashboard' ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-semibold uppercase tracking-wider md:text-sm md:normal-case">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex flex-col items-center gap-1 md:flex-row md:gap-2 px-3 py-1 rounded-lg transition-colors",
              activeTab === 'history' ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            <HistoryIcon size={20} />
            <span className="text-[10px] font-semibold uppercase tracking-wider md:text-sm md:normal-case">History</span>
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-8 pb-32 md:pt-24">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {program ? program.program_name : "Welcome back"}
                  </h1>
                  <p className="text-zinc-500 mt-1">
                    {program ? `Week ${Math.min(program.duration_weeks, Math.ceil(logs.length / 3) || 1)} of ${program.duration_weeks}` : "Start your fitness journey today"}
                  </p>
                </div>
                {!program && (
                  <Button onClick={() => setIsImporting(true)}>
                    <Upload size={18} />
                    Import Plan
                  </Button>
                )}
                {program && (
                  <Button variant="danger" onClick={handleReset} className="p-2">
                    <Trash2 size={18} />
                  </Button>
                )}
              </div>

              {!program ? (
                <Card className="p-12 flex flex-col items-center text-center space-y-4 border-dashed border-2 bg-zinc-50/50">
                  <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
                    <Plus size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">No Active Program</h3>
                    <p className="text-zinc-500 max-w-xs mx-auto mt-2">
                      Import a JSON training plan to start tracking your workouts and progress.
                    </p>
                  </div>
                  <Button onClick={() => setIsImporting(true)}>
                    Import JSON Plan
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Stats */}
                  <Card className="p-6 md:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold flex items-center gap-2">
                        <Target size={18} className="text-zinc-400" />
                        Goals
                      </h3>
                      <div className="flex gap-1">
                        {program.goal_priority.map(goal => (
                          <span key={goal} className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 px-2 py-1 rounded-md text-zinc-600">
                            {goal}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Workouts</p>
                        <p className="text-2xl font-bold mt-1">{logs.length}</p>
                      </div>
                      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Time Limit</p>
                        <p className="text-2xl font-bold mt-1">{program.session_structure.main_minutes}m</p>
                      </div>
                    </div>
                  </Card>

                  {/* Quick Start */}
                  <Card className="p-6 bg-zinc-900 text-white border-none shadow-xl flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-zinc-400 text-xs uppercase tracking-widest">Next Session</h3>
                      <p className="text-2xl font-bold mt-2">Ready to train?</p>
                    </div>
                    <Button 
                      variant="secondary" 
                      className="w-full mt-6"
                      onClick={() => {
                        const currentWeek = Math.min(program.duration_weeks, Math.ceil((logs.length + 1) / 3) || 1);
                        const prescription = calculatePrescriptionForWeek(program, currentWeek);
                        // Pick the first day that hasn't been done this week or just the first day
                        const day = Object.keys(prescription)[0];
                        startWorkout(currentWeek, day, prescription[day]);
                      }}
                    >
                      <Play size={18} fill="currentColor" />
                      Start Now
                    </Button>
                  </Card>

                  {/* Weekly Schedule */}
                  <div className="md:col-span-3 space-y-4">
                    <h3 className="font-bold text-lg">Weekly Schedule</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(() => {
                        const currentWeek = Math.min(program.duration_weeks, Math.ceil((logs.length + 1) / 3) || 1);
                        const prescription = calculatePrescriptionForWeek(program, currentWeek);
                        return Object.entries(prescription).map(([day, exercises]) => (
                          <Card key={day} className="p-5 hover:border-zinc-300 transition-colors cursor-pointer group" onClick={() => startWorkout(currentWeek, day, exercises)}>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-bold capitalize text-lg">{day}</h4>
                              <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                                <ChevronRight size={18} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              {exercises.map((ex, i) => (
                                <div key={i} className="flex items-center justify-between text-sm text-zinc-600">
                                  <span>{ex.name}</span>
                                  <span className="font-mono font-medium">
                                    {ex.sets} × {ex.reps || `${ex.hold_seconds}s`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </Card>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <h1 className="text-3xl font-bold tracking-tight">Workout History</h1>
              {logs.length === 0 ? (
                <Card className="p-12 text-center text-zinc-500">
                  No workouts logged yet.
                </Card>
              ) : (
                <div className="space-y-4">
                  {[...logs].reverse().map((log, i) => (
                    <Card key={i} className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                            {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <h4 className="font-bold text-lg capitalize">{log.day} - Week {log.week}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500 text-sm">
                          <Clock size={14} />
                          {formatSeconds(log.totalDurationSeconds)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {log.exercises.map((ex, j) => (
                          <div key={j} className="px-3 py-1 bg-zinc-50 rounded-lg border border-zinc-100 text-xs font-medium">
                            {ex.name}: {ex.sets.filter(s => s.completed).length}/{ex.sets.length}
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Import Modal */}
      <AnimatePresence>
        {isImporting && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImporting(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-xl font-bold">Import Training Plan</h2>
                <button onClick={() => setIsImporting(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-bold text-zinc-900">Option 1: Upload File</p>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-200 border-dashed rounded-2xl cursor-pointer bg-zinc-50 hover:bg-zinc-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-zinc-400" />
                      <p className="mb-2 text-sm text-zinc-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-zinc-400">JSON files only</p>
                    </div>
                    <input type="file" className="hidden" accept=".json" onChange={handleFileImport} />
                  </label>
                </div>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-100"></span></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-zinc-400 font-bold">Or</span></div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-bold text-zinc-900">Option 2: Paste JSON</p>
                  <textarea 
                    className="w-full h-32 p-4 font-mono text-xs bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none resize-none"
                    placeholder='{ "program_name": "My Plan", ... }'
                    id="json-input"
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setIsImporting(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={() => {
                    const val = (document.getElementById('json-input') as HTMLTextAreaElement).value;
                    handleImport(val);
                  }}>Import Plan</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Workout Session Overlay */}
      <AnimatePresence>
        {activeWorkout && program && (
          <WorkoutSession 
            program={program}
            week={activeWorkout.week}
            day={activeWorkout.day}
            exercises={activeWorkout.exercises}
            onClose={() => setActiveWorkout(null)}
            onComplete={async (log) => {
              await saveWorkoutLog(log);
              await loadData();
              setActiveWorkout(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Workout Session Component ---

function WorkoutSession({ 
  program, 
  week, 
  day, 
  exercises, 
  onClose, 
  onComplete 
}: { 
  program: TrainingProgram;
  week: number;
  day: string;
  exercises: PrescriptionItem[];
  onClose: () => void;
  onComplete: (log: WorkoutLog) => void;
}) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [exerciseTime, setExerciseTime] = useState(0);
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>({
    programId: program.id!,
    date: new Date().toISOString(),
    week,
    day,
    exercises: exercises.map(ex => ({
      name: ex.name,
      sets: Array(ex.sets).fill(null).map(() => ({ completed: false, value: 0, timestamp: '' }))
    })),
    totalDurationSeconds: 0,
    completed: false
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentExercise = exercises[currentExerciseIndex];
  const exerciseDef = program.exercise_library[currentExercise.name];

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSessionTime(prev => prev + 1);
      if (!isResting) {
        setExerciseTime(prev => prev + 1);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [isResting]);

  const handleSetComplete = () => {
    const newLog = { ...workoutLog };
    newLog.exercises[currentExerciseIndex].sets[currentSetIndex] = {
      completed: true,
      value: currentExercise.reps || currentExercise.hold_seconds || 0,
      timestamp: new Date().toISOString()
    };
    setWorkoutLog(newLog);

    // Check if workout is finished
    const isLastSet = currentSetIndex === currentExercise.sets - 1;
    const isLastExercise = currentExerciseIndex === exercises.length - 1;

    if (isLastSet && isLastExercise) {
      playSound('SUCCESS');
      finishWorkout(true);
    } else {
      // Start rest
      playSound('NOTIFICATION');
      setIsResting(true);
      setRestTimeLeft(exerciseDef.rest_s);
      setExerciseTime(0);
      
      restTimerRef.current = setInterval(() => {
        setRestTimeLeft(prev => {
          if (prev <= 1) {
            if (restTimerRef.current) clearInterval(restTimerRef.current);
            playSound('BEEP');
            setIsResting(false);
            if (isLastSet) {
              setCurrentExerciseIndex(prev => prev + 1);
              setCurrentSetIndex(0);
            } else {
              setCurrentSetIndex(prev => prev + 1);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const skipRest = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setIsResting(false);
    const isLastSet = currentSetIndex === currentExercise.sets - 1;
    if (isLastSet) {
      setCurrentExerciseIndex(prev => prev + 1);
      setCurrentSetIndex(0);
    } else {
      setCurrentSetIndex(prev => prev + 1);
    }
  };

  const finishWorkout = (completed: boolean) => {
    onComplete({
      ...workoutLog,
      totalDurationSeconds: sessionTime,
      completed
    });
  };

  const sessionLimitSeconds = program.session_structure.main_minutes * 60;
  const isSessionOverTime = sessionTime > sessionLimitSeconds;
  const isExerciseOverTime = exerciseDef.time_limit_s && exerciseTime > exerciseDef.time_limit_s;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-zinc-950 text-white flex flex-col"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={() => {
            if (confirm("Quit workout? Progress will not be saved.")) onClose();
          }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
          <div>
            <h2 className="font-bold text-sm uppercase tracking-widest text-zinc-500">{day} • Week {week}</h2>
            <div className="flex items-center gap-2">
              <span className={cn("text-lg font-bold font-mono", isSessionOverTime ? "text-red-400" : "text-white")}>
                {formatSeconds(sessionTime)}
              </span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-600 font-mono text-sm">{formatSeconds(sessionLimitSeconds)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          {exercises.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-1 w-8 rounded-full transition-all",
                i < currentExerciseIndex ? "bg-emerald-500" : i === currentExerciseIndex ? "bg-white" : "bg-white/20"
              )} 
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <AnimatePresence mode="wait">
          {isResting ? (
            <motion.div 
              key="rest"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Resting</h3>
                <p className="text-8xl font-black font-mono tracking-tighter">{restTimeLeft}s</p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-400">Next up</p>
                <p className="text-xl font-bold">
                  {currentSetIndex === currentExercise.sets - 1 
                    ? exercises[currentExerciseIndex + 1]?.name 
                    : `${currentExercise.name} (Set ${currentSetIndex + 2})`}
                </p>
              </div>
              <Button variant="secondary" onClick={skipRest} className="px-8 py-4 rounded-2xl">
                Skip Rest
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              key="exercise"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md space-y-12"
            >
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest">
                  Set {currentSetIndex + 1} of {currentExercise.sets}
                </div>
                <h3 className="text-5xl font-black tracking-tight capitalize">{currentExercise.name}</h3>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Target</p>
                    <p className="text-3xl font-bold mt-1">{currentExercise.reps || `${currentExercise.hold_seconds}s`}</p>
                  </div>
                  {exerciseDef.time_limit_s && (
                    <div className="text-center">
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Limit</p>
                      <p className={cn("text-3xl font-bold mt-1", isExerciseOverTime ? "text-red-400" : "text-white")}>
                        {exerciseDef.time_limit_s}s
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Exercise Timer (if hold or time limit) */}
              <div className="relative h-64 w-64 mx-auto flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle 
                    cx="128" cy="128" r="120" 
                    className="stroke-white/10 fill-none" 
                    strokeWidth="8" 
                  />
                  {exerciseDef.time_limit_s && (
                    <motion.circle 
                      cx="128" cy="128" r="120" 
                      className={cn("fill-none transition-colors", isExerciseOverTime ? "stroke-red-500" : "stroke-emerald-500")}
                      strokeWidth="8" 
                      strokeDasharray="753.98"
                      strokeDashoffset={753.98 * (1 - Math.min(1, exerciseTime / exerciseDef.time_limit_s))}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                <div className="text-center">
                  <p className="text-5xl font-black font-mono">{exerciseTime}s</p>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2">Elapsed</p>
                </div>
              </div>

              <Button 
                onClick={handleSetComplete} 
                className="w-full py-6 rounded-3xl text-xl bg-white text-black hover:bg-zinc-200"
              >
                <CheckCircle2 size={24} />
                Complete Set
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Alerts */}
      <div className="p-6">
        <AnimatePresence>
          {isSessionOverTime && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm"
            >
              <AlertCircle size={18} />
              <span>Session time limit exceeded! Keep pushing to finish.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
