
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { generateWorkoutPlan } from '../services/gemini';

interface ExerciseItem {
  id: string;
  name: string;
  category: string;
  sets: number;
  reps: string;
  weight: number;
  rest: number;
  videoUrl?: string;
}

interface TrainingSession {
  id: string;
  name: string;
  focus: string;
  exercises: ExerciseItem[];
}

const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Pernas', 'Ombros', 'Bíceps', 'Tríceps', 'Core', 'Full Body', 'Cardio', 'Mobilidade'
];

interface WorkoutEditorProps {
  onBack: () => void;
  studentId: string | null;
  studentName?: string;
}

// Completed the WorkoutEditor component and added the default export to fix the import error in App.tsx
const WorkoutEditor: React.FC<WorkoutEditorProps> = ({ onBack, studentId, studentName }) => {
  const [sessions, setSessions] = useState<TrainingSession[]>([
    { id: '1', name: 'Treino A', focus: 'Peito', exercises: [] }
  ]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState<string | null>(null); 
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExistingWorkouts = async () => {
      if (!studentId) return;
      setInitialLoading(true);
      try {
        const { data: workouts, error: wErr } = await supabase
          .from('workouts')
          .select('*, workout_exercises(*)')
          .eq('student_id', studentId)
          .order('created_at', { ascending: true });

        if (wErr) throw wErr;

        if (workouts && workouts.length > 0) {
          const formattedSessions = workouts.map(w => ({
            id: w.id,
            name: w.name,
            focus: w.focus || 'Geral',
            exercises: (w.workout_exercises || []).map((ex: any) => ({
              id: ex.id,
              name: ex.exercise_name,
              category: ex.category || 'Geral',
              sets: ex.sets || 3,
              reps: ex.reps || '12',
              weight: ex.weight || 0,
              rest: ex.rest_seconds || 60,
              videoUrl: ex.video_url || ''
            }))
          }));
          setSessions(formattedSessions);
        }
      } catch (err: any) {
        console.error("Erro ao carregar:", err);
        setError(err.message || "Erro ao conectar com o banco de dados.");
      } finally {
        setInitialLoading(false);
      }
    };
    fetchExistingWorkouts();
  }, [studentId]);

  const addSession = () => {
    const nextLetter = String.fromCharCode(65 + sessions.length);
    setSessions([...sessions, { 
      id: Math.random().toString(36).substr(2, 9), 
      name: `Treino ${nextLetter}`, 
      focus: 'Pernas',
      exercises: [] 
    }]);
  };

  const removeSession = (sessionId: string) => {
    if (sessions.length === 1) return;
    setSessions(sessions.filter(s => s.id !== sessionId));
  };

  const updateSession = (sessionId: string, updates: Partial<TrainingSession>) => {
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, ...updates } : s));
  };

  const addExercise = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    const newEx: ExerciseItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      category: session?.focus || 'Geral',
      sets: 3,
      reps: '12',
      weight: 0,
      rest: 60,
      videoUrl: ''
    };
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, exercises: [...s.exercises, newEx] } : s));
  };

  const removeExercise = (sessionId: string, exerciseId: string) => {
    setSessions(sessions.map(s => s.id === sessionId ? { 
      ...s, 
      exercises: s.exercises.filter(ex => ex.id !== exerciseId) 
    } : s));
  };

  const updateExercise = (sessionId: string, exerciseId: string, field: keyof ExerciseItem, value: any) => {
    setSessions(sessions.map(s => s.id === sessionId ? {
      ...s,
      exercises: s.exercises.map(ex => ex.id === exerciseId ? { ...ex, [field]: value } : ex)
    } : s));
  };

  const handleAiSuggest = async (sessionId: string) => {
    if (aiLoading) return;
    setAiLoading(sessionId);
    setError(null);
    try {
      const { data: student } = await supabase.from('profiles').select('*').eq('id', studentId).single();
      const session = sessions.find(s => s.id === sessionId);
      const muscleFocus = session?.focus || 'Geral';
      
      const info = `Aluno: ${student?.full_name}, Objetivo: ${student?.goal}, Nível: Intermediário. Foco: ${muscleFocus}.`;
      const suggested = await generateWorkoutPlan(info, muscleFocus);
      
      const formatted = suggested.map((s: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: s.name,
        category: s.category || muscleFocus,
        sets: s.sets || 3,
        reps: s.reps || '12',
        weight: 0,
        rest: s.rest || 60,
        videoUrl: ''
      }));
      
      setSessions(sessions.map(s => s.id === sessionId ? { ...s, exercises: [...s.exercises, ...formatted] } : s));
    } catch (err: any) {
      console.error("Erro IA Detalhado:", err);
      setError(`A IA falhou: ${err.message || "Erro desconhecido"}. Verifique o console (F12) para detalhes.`);
    } finally {
      setAiLoading(null);
    }
  };

  const handleSaveAll = async () => {
    if (sessions.some(s => !s.name)) return setError("Nomeie todos os treinos.");
    setLoading(true);
    setError(null);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) throw new Error("Sessão expirada.");

      // Limpar treinos antigos
      await supabase.from('workouts').delete().eq('student_id', studentId);

      for (const session of sessions) {
        if (session.exercises.length === 0) continue;

        const { data: workout, error: workoutErr } = await supabase
          .from('workouts')
          .insert({
            student_id: studentId,
            trainer_id: authSession.user.id,
            name: session.name,
            focus: session.focus
          })
          .select()
          .single();

        if (workoutErr) throw workoutErr;

        const exercisePayload = session.exercises.map((ex, index) => ({
          workout_id: workout.id,
          exercise_name: ex.name || 'Exercício',
          category: ex.category || session.focus,
          sets: parseInt(ex.sets.toString()) || 3,
          reps: ex.reps || '12',
          weight: parseFloat(ex.weight.toString()) || 0,
          rest_seconds: parseInt(ex.rest.toString()) || 60,
          order_index: index,
          video_url: ex.videoUrl || null
        }));

        const { error: exErr } = await supabase.from('workout_exercises').insert(exercisePayload);
        if (exErr) throw exErr;
      }

      alert("Treinos publicados com sucesso!");
      onBack();
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      setError(err.message || "Erro ao salvar no banco.");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <div className="h-screen flex items-center justify-center bg-background-dark text-primary font-black animate-pulse">CARREGANDO...</div>;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      <header className="sticky top-0 z-50 flex items-center bg-white dark:bg-surface-dark p-4 justify-between border-b shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h2 className="text-xs font-black uppercase text-primary">Prescrever</h2>
            <p className="text-base font-bold truncate max-w-[150px]">{studentName}</p>
          </div>
        </div>
        <button onClick={addSession} className="bg-primary/10 text-primary px-4 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">add</span> Novo Treino
        </button>
      </header>

      <div className="p-4 space-y-12 animate-in fade-in duration-500">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[11px] font-bold border border-red-100 animate-shake mb-4">
            <span className="material-symbols-outlined text-sm align-middle mr-1">warning</span> {error}
          </div>
        )}

        {sessions.map((session, sIdx) => (
          <section key={session.id} className="space-y-4">
            <div className="bg-white dark:bg-surface-dark rounded-[32px] p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <input 
                  className="bg-transparent border-0 text-2xl font-black p-0 focus:ring-0 w-full"
                  placeholder="Ex: Treino A"
                  value={session.name}
                  onChange={e => updateSession(session.id, { name: e.target.value })}
                />
                {sessions.length > 1 && (
                  <button onClick={() => removeSession(session.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {MUSCLE_GROUPS.map(mg => (
                  <button 
                    key={mg}
                    onClick={() => updateSession(session.id, { focus: mg })}
                    className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${session.focus === mg ? 'bg-primary border-primary text-[#10221c]' : 'bg-transparent border-gray-100 dark:border-gray-800 text-gray-400'}`}
                  >
                    {mg}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => handleAiSuggest(session.id)}
                disabled={!!aiLoading}
                className="w-full h-12 rounded-2xl bg-primary/10 text-primary font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {aiLoading === session.id ? (
                  <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">psychology</span>
                )}
                Sugerir Exercícios com IA
              </button>
            </div>

            <div className="space-y-4">
              {session.exercises.map((ex) => (
                <div key={ex.id} className="bg-white dark:bg-surface-dark rounded-[24px] p-5 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <input 
                      className="flex-1 bg-transparent border-0 font-bold text-sm p-0 focus:ring-0 placeholder:text-gray-300"
                      placeholder="Nome do exercício..."
                      value={ex.name}
                      onChange={e => updateExercise(session.id, ex.id, 'name', e.target.value)}
                    />
                    <button onClick={() => removeExercise(session.id, ex.id)} className="text-gray-200 hover:text-red-400 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Séries</label>
                      <input type="number" className="w-full h-10 rounded-xl bg-gray-50 dark:bg-gray-800/50 border-0 px-3 text-xs font-bold" value={ex.sets} onChange={e => updateExercise(session.id, ex.id, 'sets', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Reps</label>
                      <input className="w-full h-10 rounded-xl bg-gray-50 dark:bg-gray-800/50 border-0 px-3 text-xs font-bold" value={ex.reps} onChange={e => updateExercise(session.id, ex.id, 'reps', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Carga (kg)</label>
                      <input type="number" className="w-full h-10 rounded-xl bg-gray-50 dark:bg-gray-800/50 border-0 px-3 text-xs font-bold text-primary" value={ex.weight} onChange={e => updateExercise(session.id, ex.id, 'weight', e.target.value)} />
                    </div>
                  </div>
                  
                  <input 
                    className="w-full h-10 rounded-xl bg-gray-50 dark:bg-gray-800/50 border-0 px-3 text-[10px]"
                    placeholder="Link do vídeo (opcional)..."
                    value={ex.videoUrl}
                    onChange={e => updateExercise(session.id, ex.id, 'videoUrl', e.target.value)}
                  />
                </div>
              ))}
              
              <button 
                onClick={() => addExercise(session.id)}
                className="w-full py-4 rounded-[20px] border-2 border-dashed border-gray-100 dark:border-gray-800 text-[10px] font-black uppercase text-gray-400 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add</span> Adicionar Exercício
              </button>
            </div>
          </section>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 p-4 z-50">
        <button 
          onClick={handleSaveAll}
          disabled={loading}
          className="w-full bg-primary h-16 rounded-[24px] text-[#102216] font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? <div className="size-6 border-3 border-[#102216] border-t-transparent rounded-full animate-spin"></div> : "Publicar Todos os Treinos"}
        </button>
      </div>
    </div>
  );
};

export default WorkoutEditor;
