
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { View } from '../types';

type Tab = 'home' | 'workouts' | 'diet' | 'photos';
type PhotoMode = 'gallery' | 'comparison';

interface StudentDashboardProps {
  onNavigate: (view: View, id?: string) => void;
}

// Componente Interno de Slider Antes/Depois
const BeforeAfterSlider = ({ beforeUrl, afterUrl, onDelete }: { beforeUrl: string, afterUrl: string, onDelete: () => void }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);

  return (
    <div className="relative w-full aspect-[4/5] rounded-[24px] overflow-hidden shadow-xl select-none group">
      {/* Imagem DEPOIS (Fundo) */}
      <img 
        src={afterUrl} 
        alt="Depois" 
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      
      {/* Imagem ANTES (Topo com Clip-Path) */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img 
          src={beforeUrl} 
          alt="Antes" 
          className="absolute inset-0 w-full h-full object-cover" 
          draggable={false}
        />
        {/* Label Antes */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest z-20">
          Antes
        </div>
      </div>

      {/* Label Depois (visível apenas no lado direito) */}
      <div className="absolute top-4 right-4 bg-primary/90 text-[#10221c] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest z-10">
        Depois
      </div>

      {/* Linha Divisória e Handle */}
      <div 
        className="absolute inset-y-0"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute inset-y-0 -left-0.5 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)]"></div>
        <div className="absolute top-1/2 -translate-y-1/2 -left-4 size-8 bg-white rounded-full shadow-lg flex items-center justify-center text-primary z-30">
          <span className="material-symbols-outlined text-[20px]">code</span>
        </div>
      </div>

      {/* Input Range Invisível para Controle Touch/Mouse */}
      <input
        type="range"
        min="0"
        max="100"
        value={sliderPosition}
        onInput={(e: any) => setSliderPosition(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-col-resize z-40"
      />

      {/* Botão Deletar */}
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute bottom-4 right-4 z-50 bg-red-500 text-white p-2 rounded-full shadow-lg active:scale-90 transition-transform"
      >
         <span className="material-symbols-outlined text-[20px]">delete</span>
      </button>
    </div>
  );
};

const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [photoMode, setPhotoMode] = useState<PhotoMode>('gallery');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [meals, setMeals] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [comparisons, setComparisons] = useState<any[]>([]);
  
  // Upload States
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Comparison Upload State
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [showCompModal, setShowCompModal] = useState(false);

  // Delete Modal State
  const [photoToDelete, setPhotoToDelete] = useState<{id: string, url: string} | null>(null);
  const [compToDelete, setCompToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Erro ao sair:", err);
      window.location.reload();
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setErrorInfo(null);
    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      
      if (sessionErr || !session) {
        setErrorInfo("Sessão expirada. Faça login novamente.");
        return;
      }

      const myId = session.user.id;

      // 1. Perfil
      const { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', myId)
        .maybeSingle();
      
      if (pErr) console.error("Erro perfil:", pErr.message);
      setProfile(prof);

      // 2. Treinos
      const { data: wPlans } = await supabase
        .from('workouts')
        .select('id, name, focus, workout_exercises(*)')
        .eq('student_id', myId)
        .order('created_at', { ascending: false });
      setWorkouts(wPlans || []);

      // 3. Dieta
      const { data: mPlan } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('student_id', myId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (mPlan) {
        const { data: mealsData } = await supabase
          .from('meals')
          .select('*, meal_foods(*)')
          .eq('meal_plan_id', mPlan.id)
          .order('order_index', { ascending: true });
        setMeals(mealsData || []);
      }

      // 4. Fotos & Comparativos
      fetchPhotos(myId);
      fetchComparisons(myId);

    } catch (err: any) {
      console.error("Falha geral:", err);
      setErrorInfo(err.message || String(err) || "Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async (studentId: string) => {
    const { data } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    setPhotos(data || []);
  };

  const fetchComparisons = async (studentId: string) => {
    const { data } = await supabase
      .from('photo_comparisons')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    setComparisons(data || []);
  };

  useEffect(() => { 
    fetchData();
  }, []);

  const openVideo = (url: string) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  // --- Upload Gallery Logic ---
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${profile.id}/${fileName}`;

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('progress-photos')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('progress_photos')
        .insert({
          student_id: profile.id,
          photo_url: publicUrl,
          label: 'Atual' 
        });

      if (dbError) throw dbError;

      await fetchPhotos(profile.id);

    } catch (error: any) {
      alert("Erro ao subir foto: " + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Upload Comparison Logic ---
  const handleCreateComparison = async () => {
    if (!beforeFile || !afterFile) return;
    setUploading(true);

    try {
      // Helper upload function
      const uploadOne = async (file: File) => {
        const ext = file.name.split('.').pop();
        const path = `${profile.id}/comp_${Math.random()}.${ext}`;
        const { error } = await supabase.storage.from('progress-photos').upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from('progress-photos').getPublicUrl(path);
        return data.publicUrl;
      };

      // Upload paralelos
      const [beforeUrl, afterUrl] = await Promise.all([
        uploadOne(beforeFile),
        uploadOne(afterFile)
      ]);

      // Salvar no DB
      const { error } = await supabase.from('photo_comparisons').insert({
        student_id: profile.id,
        before_url: beforeUrl,
        after_url: afterUrl
      });

      if (error) throw error;

      await fetchComparisons(profile.id);
      setShowCompModal(false);
      setBeforeFile(null);
      setAfterFile(null);

    } catch (err: any) {
      alert("Erro ao criar comparativo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // --- Delete Logic ---
  const requestDeletePhoto = (photoId: string, photoUrl: string) => {
    setPhotoToDelete({ id: photoId, url: photoUrl });
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    setIsDeleting(true);
    try {
      const { id, url } = photoToDelete;
      const pathPart = url.split('/progress-photos/')[1];
      if (pathPart) await supabase.storage.from('progress-photos').remove([decodeURIComponent(pathPart)]);
      await supabase.from('progress_photos').delete().eq('id', id);
      setPhotos(prev => prev.filter(p => p.id !== id));
      setPhotoToDelete(null);
    } catch (err: any) {
      alert("Erro ao deletar: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteComparison = async () => {
    if (!compToDelete) return;
    setIsDeleting(true);
    try {
      // Nota: Idealmente deletariamos as imagens do storage tb, mas para simplificar o MVP deletamos só o registro
      // pois as imagens podem ser reutilizadas se a lógica mudasse.
      // Para ser completo, precisariamos ler a URL antes de deletar.
      await supabase.from('photo_comparisons').delete().eq('id', compToDelete);
      setComparisons(prev => prev.filter(c => c.id !== compToDelete));
      setCompToDelete(null);
    } catch (err: any) {
      alert("Erro ao deletar: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && !profile && !errorInfo) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background-dark text-primary gap-4">
        <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-[10px] uppercase tracking-widest animate-pulse">Sincronizando Ficha...</p>
      </div>
    );
  }

  return (
    <div className="pb-24 min-h-screen bg-background-light dark:bg-background-dark relative">
      {/* HEADER GERAL */}
      <header className="p-5 flex items-center justify-between sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md z-40 border-b border-gray-100/50 dark:border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
            <span className="material-symbols-outlined filled">account_circle</span>
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight leading-none text-gray-900 dark:text-white">
              {profile?.full_name?.split(' ')[0] || 'Atleta'}
            </h2>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">{profile?.goal || 'Objetivo'}</p>
          </div>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => onNavigate('chat')}
             className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm active:scale-90 transition-all"
           >
             <span className="material-symbols-outlined text-[22px] filled">chat_bubble</span>
           </button>
           <button 
             onClick={handleLogout} 
             className="size-10 rounded-xl bg-white dark:bg-surface-dark flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700 hover:text-red-500 transition-all active:scale-90"
           >
             <span className="material-symbols-outlined text-[22px]">logout</span>
           </button>
        </div>
      </header>

      {/* TABS CONTENT */}
      {activeTab === 'home' && (
        <main className="p-4 flex flex-col gap-6 animate-in fade-in duration-700">
          {errorInfo && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-[10px] font-bold animate-shake">
              <p className="flex items-center gap-2 mb-1 uppercase tracking-widest">Aviso do Sistema</p>
              {errorInfo}
            </div>
          )}

          <div className="bg-white dark:bg-surface-dark rounded-[32px] p-7 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className={`size-2 rounded-full ${workouts.length > 0 ? 'bg-primary animate-pulse' : 'bg-gray-300'}`}></span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Próximo Treino</span>
              </div>
              
              {workouts.length > 0 ? (
                <>
                  <h3 className="text-2xl font-black mt-1 mb-8 truncate text-gray-900 dark:text-white">{workouts[0]?.name}</h3>
                  <button 
                    onClick={() => setActiveTab('workouts')} 
                    className="w-full bg-primary text-[#10221c] h-14 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 hover:brightness-110"
                  >
                    ABRIR FICHA DE TREINO <span className="material-symbols-outlined text-[20px]">fitness_center</span>
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-black mt-1 mb-8 text-gray-400 italic">Nada prescrito ainda...</h3>
                  <p className="text-[11px] text-gray-500 leading-relaxed">Seu treinador ainda não publicou seu treino.</p>
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
             <button 
               onClick={() => setActiveTab('diet')}
               className="bg-orange-500 text-white p-5 rounded-[28px] flex flex-col justify-between h-32 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
             >
                <span className="material-symbols-outlined text-3xl">restaurant</span>
                <span className="font-black text-sm uppercase">Minha<br/>Dieta</span>
             </button>
             <button 
               onClick={() => setActiveTab('photos')}
               className="bg-[#10221c] dark:bg-white text-white dark:text-[#10221c] p-5 rounded-[28px] flex flex-col justify-between h-32 shadow-lg active:scale-95 transition-all"
             >
                <span className="material-symbols-outlined text-3xl">photo_camera</span>
                <span className="font-black text-sm uppercase">Fotos de<br/>Evolução</span>
             </button>
          </div>
        </main>
      )}

      {activeTab === 'workouts' && (
        <main className="p-5 animate-in fade-in duration-500">
          <header className="py-4 flex items-center justify-between">
            <h1 className="text-3xl font-black tracking-tight">Meus Treinos</h1>
          </header>
          {workouts.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30">
              <span className="material-symbols-outlined text-6xl text-gray-400">fitness_center</span>
              <p className="font-bold">Treinos não encontrados.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {workouts.map((w, idx) => (
                <div key={w.id} className="bg-white dark:bg-surface-dark rounded-[28px] p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">{idx + 1}</div>
                     <div>
                       <h3 className="font-bold">{w.name}</h3>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{w.focus}</p>
                     </div>
                  </div>
                  <div className="space-y-3">
                    {w.workout_exercises?.map((ex: any) => (
                      <div key={ex.id} className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                         <div className="flex-1">
                           <span className="text-sm font-bold block">{ex.exercise_name}</span>
                           <span className="text-[10px] text-gray-400 font-bold uppercase">{ex.sets} séries • {ex.reps} reps</span>
                         </div>
                         <div className="flex items-center gap-3">
                           {ex.video_url && (
                             <button 
                               onClick={() => openVideo(ex.video_url)}
                               className="size-9 rounded-full bg-primary/20 text-primary flex items-center justify-center active:scale-90 transition-all shadow-sm"
                             >
                               <span className="material-symbols-outlined text-[18px] filled animate-pulse">play_circle</span>
                             </button>
                           )}
                           <span className="text-xs font-black bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">{ex.weight}kg</span>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {activeTab === 'diet' && (
        <main className="p-5 animate-in fade-in duration-500">
           <header className="py-4 flex items-center justify-between">
            <h1 className="text-3xl font-black tracking-tight">Dieta</h1>
          </header>
          {meals.length === 0 ? (
             <div className="py-20 text-center opacity-30 text-gray-400 font-bold">Sem plano alimentar definido.</div>
          ) : (
            <div className="space-y-6">
              {meals.map((meal) => (
                <div key={meal.id} className="bg-white dark:bg-surface-dark rounded-[28px] p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="font-bold text-orange-500">{meal.name}</h3>
                     <span className="text-[10px] font-black text-gray-400">{meal.time}</span>
                   </div>
                   <div className="space-y-2">
                     {meal.meal_foods?.map((food: any) => (
                       <div key={food.id} className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">{food.food_name}</span>
                          <span className="font-bold">{food.amount}</span>
                       </div>
                     ))}
                   </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {activeTab === 'photos' && (
        <main className="p-5 animate-in fade-in duration-500">
          <header className="py-4 flex items-center justify-between">
            <h1 className="text-3xl font-black tracking-tight">Evolução</h1>
          </header>

          {/* Sub-tabs Toggle */}
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-6">
            <button 
              onClick={() => setPhotoMode('gallery')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${photoMode === 'gallery' ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-gray-400'}`}
            >
              Galeria
            </button>
            <button 
              onClick={() => setPhotoMode('comparison')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${photoMode === 'comparison' ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-gray-400'}`}
            >
              Comparar
            </button>
          </div>
          
          {photoMode === 'gallery' ? (
            <>
              <div className="mb-8">
                <button 
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-16 rounded-[24px] bg-[#10221c] dark:bg-white text-white dark:text-[#10221c] font-black shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-70"
                >
                   {uploading ? (
                     <>
                       <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                       <span>ENVIANDO...</span>
                     </>
                   ) : (
                     <>
                       <span className="material-symbols-outlined text-2xl">add_a_photo</span>
                       ADICIONAR FOTO
                     </>
                   )}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                 {photos.length === 0 ? (
                   <div className="col-span-2 py-10 text-center opacity-40">
                     <span className="material-symbols-outlined text-5xl mb-2">image_not_supported</span>
                     <p className="text-sm font-bold">Nenhuma foto salva.</p>
                   </div>
                 ) : (
                   photos.map(photo => (
                     <div key={photo.id} className="relative group rounded-[24px] overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-[3/4] shadow-md">
                        <img src={photo.photo_url} className="w-full h-full object-cover" alt="Evolução" />
                        <button 
                           onClick={(e) => { e.stopPropagation(); requestDeletePhoto(photo.id, photo.photo_url); }}
                           className="absolute top-2 right-2 bg-red-500 text-white size-8 rounded-full flex items-center justify-center shadow-lg z-20 hover:bg-red-600 active:scale-90 transition-all"
                         >
                           <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3 pointer-events-none">
                           <p className="text-white text-[10px] font-black uppercase">{new Date(photo.created_at).toLocaleDateString()}</p>
                           <p className="text-primary text-[10px] font-bold uppercase">{photo.label}</p>
                        </div>
                     </div>
                   ))
                 )}
              </div>
            </>
          ) : (
            <>
              {/* COMPARISON MODE */}
              <div className="mb-8">
                <button 
                  onClick={() => setShowCompModal(true)}
                  className="w-full h-16 rounded-[24px] bg-primary text-[#10221c] font-black shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                   <span className="material-symbols-outlined text-2xl">compare</span>
                   CRIAR COMPARATIVO
                </button>
              </div>

              <div className="space-y-8">
                {comparisons.length === 0 ? (
                   <div className="py-10 text-center opacity-40">
                     <span className="material-symbols-outlined text-5xl mb-2">compare_arrows</span>
                     <p className="text-sm font-bold">Nenhum comparativo criado.</p>
                   </div>
                ) : (
                  comparisons.map(comp => (
                    <div key={comp.id} className="animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className="material-symbols-outlined text-primary text-sm">calendar_month</span>
                        <span className="text-[10px] font-black uppercase text-gray-500">{new Date(comp.created_at).toLocaleDateString()}</span>
                      </div>
                      <BeforeAfterSlider 
                        beforeUrl={comp.before_url}
                        afterUrl={comp.after_url}
                        onDelete={() => { setCompToDelete(comp.id); setIsDeleting(false); }}
                      />
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </main>
      )}

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-background-dark/90 backdrop-blur-2xl border-t border-gray-100/50 dark:border-gray-800/50 flex justify-around items-center h-22 px-2 pb-6 pt-3 z-50">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1.5 w-full transition-all ${activeTab === 'home' ? 'text-primary' : 'text-gray-300'}`}>
          <span className={`material-symbols-outlined text-[24px] ${activeTab === 'home' ? 'filled' : ''}`}>home</span>
          <span className="text-[9px] font-black uppercase tracking-tighter">Início</span>
        </button>
        <button onClick={() => setActiveTab('workouts')} className={`flex flex-col items-center gap-1.5 w-full transition-all ${activeTab === 'workouts' ? 'text-primary' : 'text-gray-300'}`}>
          <span className={`material-symbols-outlined text-[24px] ${activeTab === 'workouts' ? 'filled' : ''}`}>fitness_center</span>
          <span className="text-[9px] font-black uppercase tracking-tighter">Treino</span>
        </button>
        <button onClick={() => setActiveTab('diet')} className={`flex flex-col items-center gap-1.5 w-full transition-all ${activeTab === 'diet' ? 'text-primary' : 'text-gray-300'}`}>
          <span className={`material-symbols-outlined text-[24px] ${activeTab === 'diet' ? 'filled' : ''}`}>restaurant</span>
          <span className="text-[9px] font-black uppercase tracking-tighter">Dieta</span>
        </button>
        <button onClick={() => setActiveTab('photos')} className={`flex flex-col items-center gap-1.5 w-full transition-all ${activeTab === 'photos' ? 'text-primary' : 'text-gray-300'}`}>
          <span className={`material-symbols-outlined text-[24px] ${activeTab === 'photos' ? 'filled' : ''}`}>photo_library</span>
          <span className="text-[9px] font-black uppercase tracking-tighter">Fotos</span>
        </button>
      </nav>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (FOTO) */}
      {photoToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => !isDeleting && setPhotoToDelete(null)}></div>
          <div className="relative w-full max-w-sm bg-white dark:bg-surface-dark rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col items-center text-center">
              <div className="size-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-500">
                <span className="material-symbols-outlined text-3xl">delete_forever</span>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Apagar Foto?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-6">Essa ação é permanente.</p>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button onClick={() => setPhotoToDelete(null)} disabled={isDeleting} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold text-sm">Cancelar</button>
                <button onClick={confirmDeletePhoto} disabled={isDeleting} className="h-12 rounded-xl bg-red-500 text-white font-bold text-sm shadow-lg">
                  {isDeleting ? "Apagando..." : "Sim, Apagar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (COMPARATIVO) */}
      {compToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => !isDeleting && setCompToDelete(null)}></div>
          <div className="relative w-full max-w-sm bg-white dark:bg-surface-dark rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col items-center text-center">
              <div className="size-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-500">
                <span className="material-symbols-outlined text-3xl">delete_forever</span>
              </div>
              <h3 className="text-xl font-black mb-2">Apagar Comparativo?</h3>
              <p className="text-sm text-gray-500 mb-6">As fotos originais podem ser perdidas se não estiverem na galeria.</p>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button onClick={() => setCompToDelete(null)} disabled={isDeleting} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold text-sm">Cancelar</button>
                <button onClick={confirmDeleteComparison} disabled={isDeleting} className="h-12 rounded-xl bg-red-500 text-white font-bold text-sm shadow-lg">
                  {isDeleting ? "Apagando..." : "Sim, Apagar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO DE COMPARATIVO */}
      {showCompModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => !uploading && setShowCompModal(false)}></div>
          <div className="relative w-full max-w-sm bg-white dark:bg-surface-dark rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
             <h3 className="text-xl font-black mb-6 text-center">Novo Comparativo</h3>
             
             <div className="flex flex-col gap-4">
               {/* Input Antes */}
               <div 
                 onClick={() => beforeInputRef.current?.click()}
                 className={`h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${beforeFile ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-gray-700'}`}
               >
                 {beforeFile ? (
                   <>
                     <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
                     <p className="text-xs font-bold truncate max-w-[200px]">{beforeFile.name}</p>
                   </>
                 ) : (
                   <>
                     <span className="material-symbols-outlined text-gray-400 text-3xl">history</span>
                     <p className="text-xs font-bold text-gray-400 uppercase">Selecionar FOTO ANTES</p>
                   </>
                 )}
                 <input type="file" ref={beforeInputRef} className="hidden" accept="image/*" onChange={(e) => setBeforeFile(e.target.files?.[0] || null)} />
               </div>

               {/* Input Depois */}
               <div 
                 onClick={() => afterInputRef.current?.click()}
                 className={`h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${afterFile ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-gray-700'}`}
               >
                 {afterFile ? (
                   <>
                     <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
                     <p className="text-xs font-bold truncate max-w-[200px]">{afterFile.name}</p>
                   </>
                 ) : (
                   <>
                     <span className="material-symbols-outlined text-gray-400 text-3xl">update</span>
                     <p className="text-xs font-bold text-gray-400 uppercase">Selecionar FOTO DEPOIS</p>
                   </>
                 )}
                 <input type="file" ref={afterInputRef} className="hidden" accept="image/*" onChange={(e) => setAfterFile(e.target.files?.[0] || null)} />
               </div>

               <button 
                 disabled={!beforeFile || !afterFile || uploading}
                 onClick={handleCreateComparison}
                 className="h-14 bg-primary text-[#10221c] font-black rounded-xl shadow-lg mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
               >
                 {uploading ? "Processando..." : "Gerar Comparativo"}
               </button>
             </div>

             <button 
               onClick={() => setShowCompModal(false)}
               disabled={uploading}
               className="w-full py-3 mt-2 text-gray-400 text-xs font-bold uppercase"
             >
               Cancelar
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
