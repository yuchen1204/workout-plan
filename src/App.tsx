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
  Trash2,
  BarChart3,
  Settings as SettingsIcon,
  Download,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Library as LibraryIcon,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TrainingProgram, WorkoutLog, PrescriptionItem } from './types';
import { getActiveProgram, saveProgram, getWorkoutLogs, saveWorkoutLog, clearAllData } from './services/db';
import { calculatePrescriptionForWeek, formatSeconds, playSound, formatExerciseTarget } from './utils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void; key?: React.Key }) => (
  <div 
    onClick={onClick}
    className={cn(
      "bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden transition-colors",
      "dark:bg-zinc-900 dark:border-zinc-800",
      className
    )}
  >
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
    primary: "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20",
    ghost: "bg-transparent text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
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

const Logo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={cn("relative flex-shrink-0", className)}>
    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
      <rect width="100" height="100" rx="24" fill="#09090b" />
      <path d="M25 55 H38 L45 30 L55 75 L63 45 L70 55 H80" stroke="#10b981" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="80" cy="55" r="3" fill="white" />
    </svg>
  </div>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'stats' | 'settings' | 'library'>('dashboard');
  const [program, setProgram] = useState<TrainingProgram | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('dark_mode');
    return saved === 'true';
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('sound_enabled');
    return saved === null ? true : saved === 'true';
  });
  const [activeWorkout, setActiveWorkout] = useState<{
    week: number;
    day: string;
    exercises: PrescriptionItem[];
  } | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const hasGifs = program && Object.values(program.exercise_library).some((def: any) => def.gif_url);

  useEffect(() => {
    loadData();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('sound_enabled', soundEnabled.toString());
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('dark_mode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (activeTab === 'library' && !hasGifs) {
      setActiveTab('dashboard');
    }
  }, [hasGifs, activeTab]);

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
    try {
      await clearAllData();
      setProgram(null);
      setLogs([]);
      setIsConfirmingDelete(false);
    } catch (error) {
      console.error("Failed to clear data:", error);
      alert("Failed to clear data. Please try again.");
    }
  };

  const handleExport = () => {
    const data = { program, logs };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fittrack-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const startWorkout = (week: number, day: string, exercises: PrescriptionItem[]) => {
    setActiveWorkout({ week, day, exercises });
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans transition-colors dark:bg-zinc-950 dark:text-zinc-100">
      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-6 py-3 z-50 md:top-0 md:bottom-auto md:border-t-0 md:border-b dark:bg-zinc-900 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto flex justify-around md:justify-start md:gap-8">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex flex-col items-center gap-1 md:flex-row md:gap-2 px-3 py-1 rounded-lg transition-colors",
              activeTab === 'dashboard' ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            )}
          >
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-semibold uppercase tracking-wider md:text-sm md:normal-case">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex flex-col items-center gap-1 md:flex-row md:gap-2 px-3 py-1 rounded-lg transition-colors",
              activeTab === 'history' ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            )}
          >
            <HistoryIcon size={20} />
            <span className="text-[10px] font-semibold uppercase tracking-wider md:text-sm md:normal-case">History</span>
          </button>
          {hasGifs && (
            <button 
              onClick={() => setActiveTab('library')}
              className={cn(
                "flex flex-col items-center gap-1 md:flex-row md:gap-2 px-3 py-1 rounded-lg transition-colors",
                activeTab === 'library' ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
            >
              <LibraryIcon size={20} />
              <span className="text-[10px] font-semibold uppercase tracking-wider md:text-sm md:normal-case">Library</span>
            </button>
          )}
          <button 
            onClick={() => setActiveTab('stats')}
            className={cn(
              "flex flex-col items-center gap-1 md:flex-row md:gap-2 px-3 py-1 rounded-lg transition-colors",
              activeTab === 'stats' ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            )}
          >
            <BarChart3 size={20} />
            <span className="text-[10px] font-semibold uppercase tracking-wider md:text-sm md:normal-case">Stats</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex flex-col items-center gap-1 md:flex-row md:gap-2 px-3 py-1 rounded-lg transition-colors",
              activeTab === 'settings' ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            )}
          >
            <SettingsIcon size={20} />
            <span className="text-[10px] font-semibold uppercase tracking-wider md:text-sm md:normal-case">Settings</span>
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
                  <div className="flex items-center gap-4">
                    <Logo className="w-12 h-12" />
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight dark:text-white">
                        {program ? program.program_name : "Welcome back"}
                      </h1>
                      <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                        {program ? `Week ${Math.min(program.duration_weeks, Math.ceil(logs.length / 3) || 1)} of ${program.duration_weeks}` : "Start your fitness journey today"}
                      </p>
                    </div>
                  </div>
                  {!program && (
                    <Button onClick={() => setIsImporting(true)}>
                      <Upload size={18} />
                      Import Plan
                    </Button>
                  )}
                  {program && (
                    <Button 
                      variant="danger" 
                      onClick={() => setIsConfirmingDelete(true)} 
                      className="p-2"
                    >
                      <Trash2 size={18} />
                    </Button>
                  )}
                </div>

              {!program ? (
                <Card className="p-12 flex flex-col items-center text-center space-y-6 border-dashed border-2 bg-zinc-50/50 dark:bg-zinc-900/20">
                  <Logo className="w-20 h-20 shadow-2xl rounded-3xl" />
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
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Workouts</p>
                    <p className="text-2xl font-bold mt-1">{logs.length}</p>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Time Limit</p>
                    <p className="text-2xl font-bold mt-1">{program.session_structure.main_minutes}m</p>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 col-span-2">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Current Streak</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Flame size={20} className="text-orange-500 fill-orange-500" />
                      <p className="text-2xl font-bold">
                        {(() => {
                          if (logs.length === 0) return 0;
                          let streak = 0;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                          let lastDate = new Date(sortedLogs[0].date);
                          lastDate.setHours(0, 0, 0, 0);
                          
                          // If last workout was not today or yesterday, streak is 0 (or 1 if today)
                          const diff = (today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24);
                          if (diff > 1) return 0;
                          
                          streak = 1;
                          for (let i = 1; i < sortedLogs.length; i++) {
                            const currentDate = new Date(sortedLogs[i].date);
                            currentDate.setHours(0, 0, 0, 0);
                            const dayDiff = (lastDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24);
                            if (dayDiff === 1) {
                              streak++;
                              lastDate = currentDate;
                            } else if (dayDiff > 1) {
                              break;
                            }
                          }
                          return streak;
                        })()} Days
                      </p>
                    </div>
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
                          <Card key={day} className="p-5 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer group" onClick={() => startWorkout(currentWeek, day, exercises)}>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-bold capitalize text-lg">{day}</h4>
                              <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-900 dark:group-hover:bg-zinc-100 group-hover:text-white dark:group-hover:text-zinc-900 transition-colors">
                                <ChevronRight size={18} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              {exercises.map((ex, i) => (
                                <div key={i} className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                                  <span>{ex.name}</span>
                                  <span className="font-mono font-medium">
                                    {ex.sets} × {formatExerciseTarget(ex)}
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
          ) : activeTab === 'library' ? (
            <motion.div 
              key="library"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <h1 className="text-3xl font-bold tracking-tight dark:text-white">Exercise Library</h1>
              {!program ? (
                <Card className="p-12 text-center text-zinc-500">
                  Import a program to view its exercise library.
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(program.exercise_library)
                    .filter(([_, def]) => (def as any).gif_url)
                    .map(([name, def]) => {
                      const exercise = def as any;
                      return (
                        <Card key={name} className="flex flex-col">
                          <div className="aspect-video w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <img 
                              src={exercise.gif_url} 
                              alt={name} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="p-6 space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xl font-bold capitalize dark:text-white">{name}</h3>
                              <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                {exercise.type.replace('_', ' ')}
                              </span>
                            </div>
                            {exercise.description && (
                              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                {exercise.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 pt-2">
                              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                <Clock size={14} />
                                <span>Rest: {exercise.rest_s}s</span>
                              </div>
                              {exercise.time_limit_s && (
                                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                  <Timer size={14} />
                                  <span>Limit: {exercise.time_limit_s}s</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              )}
            </motion.div>
          ) : activeTab === 'stats' ? (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-bold mb-6 text-zinc-500 text-xs uppercase tracking-widest">Exercise Progress</h3>
                  <div className="space-y-4">
                    <select 
                      value={selectedExercise}
                      onChange={(e) => setSelectedExercise(e.target.value)}
                      className="w-full p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm outline-none"
                    >
                      <option value="">Select an exercise</option>
                      {Array.from(new Set(logs.flatMap(l => l.exercises.map(e => e.name)))).map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    
                    <div className="h-64 w-full">
                      {selectedExercise ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={logs.filter(l => l.exercises.some(e => e.name === selectedExercise)).map(l => {
                            const ex = l.exercises.find(e => e.name === selectedExercise);
                            const avgValue = ex ? ex.sets.reduce((acc, s) => acc + s.value, 0) / ex.sets.length : 0;
                            const maxWeight = ex ? Math.max(...ex.sets.map(s => s.weight_kg || 0)) : 0;
                            return {
                              date: new Date(l.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                              value: Number(avgValue.toFixed(1)),
                              weight: maxWeight
                            };
                          })}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: 'none', 
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                backgroundColor: darkMode ? '#18181b' : '#ffffff',
                                color: darkMode ? '#ffffff' : '#000000'
                              }}
                            />
                            <Line type="monotone" dataKey="value" name="Avg Reps/Sec" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                            <Line type="monotone" dataKey="weight" name="Max Weight" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
                          Select an exercise to see progress
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold mb-6 text-zinc-500 text-xs uppercase tracking-widest">Workout Duration (Last 7)</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={logs.slice(-7).map(l => ({ 
                        name: new Date(l.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
                        minutes: Math.round(l.totalDurationSeconds / 60) 
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            backgroundColor: darkMode ? '#18181b' : '#ffffff',
                            color: darkMode ? '#ffffff' : '#000000'
                          }}
                          cursor={{ fill: darkMode ? '#27272a' : '#f4f4f5' }}
                        />
                        <Bar dataKey="minutes" fill={darkMode ? '#f4f4f5' : '#18181b'} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold mb-6 text-zinc-500 text-xs uppercase tracking-widest">Volume Trend</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={logs.slice(-10).map((l, i) => ({ 
                        index: i + 1, 
                        sets: l.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0) 
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="index" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            backgroundColor: darkMode ? '#18181b' : '#ffffff',
                            color: darkMode ? '#ffffff' : '#000000'
                          }}
                        />
                        <Line type="monotone" dataKey="sets" stroke={darkMode ? '#f4f4f5' : '#18181b'} strokeWidth={2} dot={{ fill: darkMode ? '#f4f4f5' : '#18181b', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 text-center">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Workouts</p>
                  <p className="text-4xl font-black mt-2">{logs.length}</p>
                </Card>
                <Card className="p-6 text-center">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Minutes</p>
                  <p className="text-4xl font-black mt-2">
                    {Math.round(logs.reduce((acc, l) => acc + l.totalDurationSeconds, 0) / 60)}
                  </p>
                </Card>
                <Card className="p-6 text-center">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Avg. Duration</p>
                  <p className="text-4xl font-black mt-2">
                    {logs.length ? Math.round(logs.reduce((acc, l) => acc + l.totalDurationSeconds, 0) / logs.length / 60) : 0}m
                  </p>
                </Card>
              </div>
            </motion.div>
          ) : activeTab === 'settings' ? (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

              <div className="space-y-4">
                <h3 className="font-bold text-zinc-500 text-xs uppercase tracking-widest">Preferences</h3>
                <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {deferredPrompt && (
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <Download size={20} />
                        </div>
                        <div>
                          <p className="font-bold dark:text-white">Install App</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">Add to your home screen</p>
                        </div>
                      </div>
                      <Button onClick={handleInstall} className="py-1.5 px-3 text-sm">
                        Install
                      </Button>
                    </div>
                  )}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                        {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                      </div>
                      <div>
                        <p className="font-bold dark:text-white">Dark Mode</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Switch app appearance</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setDarkMode(!darkMode)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        darkMode ? "bg-emerald-500" : "bg-zinc-200"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        darkMode ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                      </div>
                      <div>
                        <p className="font-bold dark:text-white">Sound Effects</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Play cues during workout</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        soundEnabled ? "bg-zinc-900 dark:bg-zinc-700" : "bg-zinc-200"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        soundEnabled ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                </Card>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-zinc-500 text-xs uppercase tracking-widest">Data Management</h3>
                <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <button 
                    onClick={handleExport}
                    className="w-full p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                        <Download size={20} />
                      </div>
                      <div>
                        <p className="font-bold">Export Data</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Download backup as JSON</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-300 dark:text-zinc-600" />
                  </button>

                  <button 
                    onClick={() => setIsConfirmingDelete(true)}
                    className="w-full p-4 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors group"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center text-red-600 group-hover:bg-red-100 dark:group-hover:bg-red-500/20">
                        <Trash2 size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-red-600 dark:text-red-400">Reset All Data</p>
                        <p className="text-xs text-red-400 dark:text-red-500/60">Permanently delete programs and logs</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-red-200 dark:text-red-900" />
                  </button>
                </Card>
              </div>

              <div className="pt-8 text-center">
                <p className="text-xs text-zinc-400 font-medium">FitTrack Pro v1.1.0</p>
              </div>
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
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm">
                          <Clock size={14} />
                          {formatSeconds(log.totalDurationSeconds)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {log.exercises.map((ex, j) => (
                          <div key={j} className="px-3 py-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700 text-xs font-medium">
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
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-bold dark:text-white">Import Training Plan</h2>
                <button onClick={() => setIsImporting(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors dark:text-zinc-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Option 1: Upload File</p>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-200 dark:border-zinc-800 border-dashed rounded-2xl cursor-pointer bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-zinc-400" />
                      <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-zinc-400">JSON files only</p>
                    </div>
                    <input type="file" className="hidden" accept=".json" onChange={handleFileImport} />
                  </label>
                </div>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-100 dark:border-zinc-800"></span></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400 font-bold">Or</span></div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Option 2: Paste JSON</p>
                  <textarea 
                    className="w-full h-32 p-4 font-mono text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent outline-none resize-none dark:text-zinc-100"
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isConfirmingDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmingDelete(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2 dark:text-white">Are you sure?</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8">
                This will permanently delete all your training programs and workout history. This action cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                <Button variant="danger" className="w-full py-4 rounded-2xl" onClick={handleReset}>
                  Yes, Delete Everything
                </Button>
                <Button variant="secondary" className="w-full py-4 rounded-2xl" onClick={() => setIsConfirmingDelete(false)}>
                  Cancel
                </Button>
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
  const [isPaused, setIsPaused] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [exerciseTime, setExerciseTime] = useState(0);
  const [actualValue, setActualValue] = useState<number>(0);
  const [actualWeight, setActualWeight] = useState<number>(0);
  const [actualDistance, setActualDistance] = useState<number>(0);
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
    if (localStorage.getItem('sound_enabled') !== 'false') playSound('START');
  }, []);

  useEffect(() => {
    // Reset actual values when set or exercise changes
    setActualValue(currentExercise.reps || currentExercise.hold_seconds || currentExercise.reps_each_side || currentExercise.hold_seconds_each_side || 0);
    setActualWeight(currentExercise.weight_kg || 0);
    setActualDistance(currentExercise.distance_m || 0);
  }, [currentExerciseIndex, currentSetIndex]);

  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setSessionTime(prev => prev + 1);
      if (!isResting) {
        setExerciseTime(prev => prev + 1);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isResting, isPaused]);

  useEffect(() => {
    if (isPaused || !isResting) return;

    restTimerRef.current = setInterval(() => {
      setRestTimeLeft(prev => {
        if (prev <= 4 && prev > 1) {
          if (localStorage.getItem('sound_enabled') !== 'false') playSound('TICK');
        }
        if (prev <= 1) {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          if (localStorage.getItem('sound_enabled') !== 'false') playSound('BEEP');
          setTimeout(() => {
            if (localStorage.getItem('sound_enabled') !== 'false') playSound('START');
          }, 500);
          setIsResting(false);
          const isLastSet = currentSetIndex === currentExercise.sets - 1;
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

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [isResting, isPaused, currentExerciseIndex, currentSetIndex]);

  const handleSetComplete = () => {
    const newLog = { ...workoutLog };
    newLog.exercises[currentExerciseIndex].sets[currentSetIndex] = {
      completed: true,
      value: actualValue,
      weight_kg: actualWeight > 0 ? actualWeight : undefined,
      distance_m: actualDistance > 0 ? actualDistance : undefined,
      timestamp: new Date().toISOString()
    };
    setWorkoutLog(newLog);

    // Check if workout is finished
    const isLastSet = currentSetIndex === currentExercise.sets - 1;
    const isLastExercise = currentExerciseIndex === exercises.length - 1;

    if (isLastSet && isLastExercise) {
      if (localStorage.getItem('sound_enabled') !== 'false') playSound('SUCCESS');
      finishWorkout(true);
    } else {
      // Start rest
      if (localStorage.getItem('sound_enabled') !== 'false') playSound('NOTIFICATION');
      setIsResting(true);
      setRestTimeLeft(exerciseDef.rest_s);
      setExerciseTime(0);
    }
  };

  const skipRest = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    if (localStorage.getItem('sound_enabled') !== 'false') playSound('START');
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
          <button 
            onClick={() => setIsPaused(true)} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400"
            title="Pause Workout"
          >
            <div className="flex gap-1">
              <div className="w-1.5 h-5 bg-current rounded-full" />
              <div className="w-1.5 h-5 bg-current rounded-full" />
            </div>
          </button>
          <div>
            <h2 className="font-bold text-sm uppercase tracking-widest text-zinc-500">
              {day} • Week {week}
            </h2>
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
                
                {exerciseDef.gif_url && (
                  <div className="w-full aspect-video bg-white/5 rounded-3xl overflow-hidden border border-white/10">
                    <img 
                      src={exerciseDef.gif_url} 
                      alt={currentExercise.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-8">
                  <div className="text-center">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Target</p>
                    <p className="text-3xl font-bold mt-1">
                      {formatExerciseTarget(currentExercise)}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
                      Actual {(currentExercise.reps || currentExercise.reps_each_side) ? 'Reps' : 'Seconds'}
                    </p>
                    <input 
                      type="number" 
                      value={actualValue}
                      onChange={(e) => setActualValue(Number(e.target.value))}
                      className="text-3xl font-bold mt-1 bg-transparent border-b border-white/20 w-20 text-center focus:border-white outline-none"
                    />
                  </div>
                  {(currentExercise.weight_kg !== undefined || actualWeight > 0) && (
                    <div className="text-center">
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Weight (kg)</p>
                      <input 
                        type="number" 
                        value={actualWeight}
                        onChange={(e) => setActualWeight(Number(e.target.value))}
                        className="text-3xl font-bold mt-1 bg-transparent border-b border-white/20 w-20 text-center focus:border-white outline-none"
                      />
                    </div>
                  )}
                  {(currentExercise.distance_m !== undefined || actualDistance > 0) && (
                    <div className="text-center">
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Distance (m)</p>
                      <input 
                        type="number" 
                        value={actualDistance}
                        onChange={(e) => setActualDistance(Number(e.target.value))}
                        className="text-3xl font-bold mt-1 bg-transparent border-b border-white/20 w-20 text-center focus:border-white outline-none"
                      />
                    </div>
                  )}
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
                disabled={isPaused}
                className="w-full py-6 rounded-3xl text-xl bg-white text-black hover:bg-zinc-200"
              >
                <CheckCircle2 size={24} />
                Complete Set
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pause Overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[210] bg-zinc-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
              <Clock size={40} className="text-zinc-400" />
            </div>
            <h2 className="text-4xl font-black mb-2">Workout Paused</h2>
            <p className="text-zinc-400 mb-12 max-w-xs">Your progress is held. What would you like to do?</p>
            
            <div className="flex flex-col w-full max-w-xs gap-3">
              <Button onClick={() => setIsPaused(false)} className="py-6 rounded-2xl text-xl bg-white text-black">
                <Play size={20} fill="currentColor" />
                Resume Workout
              </Button>
              
              <Button variant="secondary" onClick={() => finishWorkout(false)} className="py-4 rounded-2xl">
                <CheckCircle2 size={18} />
                Finish & Save Progress
              </Button>

              <Button variant="ghost" onClick={onClose} className="py-4 rounded-2xl text-red-400 hover:bg-red-500/10 hover:text-red-400">
                <X size={18} />
                Discard & Quit
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
