
import React, { useState } from 'react';
import { Student } from '../types';
import { supabase } from '../services/supabase';

interface StudentDetailProps {
  student: Student;
  onBack: () => void;
  onAction: (action: string) => void;
  onDeleteSuccess?: (id: string) => void;
}

// Slider Component for Trainer View (Read Only)
const BeforeAfterSlider = ({ beforeUrl, afterUrl }: { beforeUrl: string, afterUrl: string }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  return (
    <div className="relative w-full aspect-[4/5] rounded-[24px] overflow-hidden shadow-sm select-none group bg-gray-200">
      <img src={afterUrl} alt="Depois" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      <div className="absolute inset-0 w-full h-full" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
        <img src={beforeUrl} alt="Antes" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest z-20">Antes</div>
      </div>
      <div className="absolute top-2 right-2 bg-primary/90 text-[#10221c] px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest z-10">Depois</div>
      <div className="absolute inset-y-0" style={{ left: `${sliderPosition}%` }}>
        <div className="absolute inset-y-0 -left-0.5 w-0.5 bg-white shadow-sm"></div>
        <div className="absolute top-1/2 -translate-y-1/2 -left-3 size-6 bg-white rounded-full shadow flex items-center justify-center text-primary z-30">
          <span className="material-symbols-outlined text-[14px]">code</span>
        </div>
      </div>
      <input type="range" min="0" max="100" value={sliderPosition} onInput={(e: any) => setSliderPosition(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-col-resize z-40" />
    </div>
  );
};

const StudentDetail: React.FC<StudentDetailProps> = ({ student, onBack, onAction, onDeleteSuccess }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  // States para Galeria
  const [showGallery, setShowGallery] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [galleryTab, setGalleryTab] = useState<'photos' | 'comparisons'>('photos');

  // 1. Abre o modal de inativação
  const handleRequestInactivation = () => {
    setErrorDetails(null);
    setShowConfirmModal(true);
  };

  // 2. Executa a ação de inativação
  const handleConfirmInactivation = async () => {
    setShowConfirmModal(false);
    setIsDeleting(true);
    const sId = student.id;

    try {
      setDeleteStep("Inativando...");
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('id', sId);

      if (updateError) throw new Error(updateError.message);

      setDeleteStep("Aluno Inativo!");
      setTimeout(() => {
        if (onDeleteSuccess) onDeleteSuccess(sId);
        else onBack();
      }, 600);
    } catch (err: any) {
      setErrorDetails(err.message || "Falha ao inativar aluno.");
      setIsDeleting(false);
    }
  };

  // 3. Buscar fotos para a galeria
  const handleOpenGallery = async () => {
    setShowGallery(true);
    setLoadingPhotos(true);
    try {
      const pReq = supabase.from('progress_photos').select('*').eq('student_id', student.id).order('created_at', { ascending: false });
      const cReq = supabase.from('photo_comparisons').select('*').eq('student_id', student.id).order('created_at', { ascending: false });
      
      const [resPhotos, resComps] = await Promise.all([pReq, cReq]);
      
      setPhotos(resPhotos.data || []);
      setComparisons(resComps.data || []);
    } catch (err) {
      console.error("Erro ao carregar mídia:", err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32 relative">
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <span className="material-symbols-outlined font-bold">arrow_back</span>
          </button>
          <h2 className="text-xl font-bold tracking-tight">Ficha do Aluno</h2>
        </div>
      </header>

      {/* Info do Aluno */}
      <div className="bg-white dark:bg-surface-dark pt-10 pb-8 px-4 flex flex-col items-center border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="relative">
          <div 
            className="bg-center bg-no-repeat bg-cover rounded-[32px] size-28 shadow-2xl ring-4 ring-primary/20" 
            style={{ backgroundImage: `url(${student.avatar})` }}
          />
          <div className="absolute -bottom-2 -right-2 bg-primary text-[#10221c] size-9 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-[20px] font-black">check_circle</span>
          </div>
        </div>
        <div className="mt-5 text-center">
          <h1 className="text-2xl font-black tracking-tight">{student.name}</h1>
          <p className="text-primary font-bold text-xs uppercase tracking-widest mt-1">{student.goal}</p>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-8">
        {errorDetails && (
          <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900/30 p-5 rounded-3xl animate-shake">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-red-600 text-lg">report</span>
              <p className="text-red-600 dark:text-red-400 text-[10px] font-black uppercase mb-0">Erro ao Inativar</p>
            </div>
            <p className="text-[11px] font-bold text-red-700 dark:text-red-300">{errorDetails}</p>
          </div>
        )}

        {/* Botões de Ação */}
        <section className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => onAction('create-workout')}
            className="flex flex-col items-start justify-between p-6 h-40 rounded-[32px] bg-primary text-[#10221c] shadow-xl shadow-primary/10 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-3xl font-bold">fitness_center</span>
            <p className="font-black text-lg leading-tight">Novo<br/>Treino</p>
          </button>

          <button 
            onClick={() => onAction('create-meal')}
            className="flex flex-col items-start justify-between p-6 h-40 rounded-[32px] bg-white dark:bg-surface-dark border-2 border-gray-100 dark:border-gray-800 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-3xl font-bold text-orange-500">restaurant</span>
            <p className="font-black text-lg leading-tight">Plano<br/>Alimentar</p>
          </button>
          
          {/* Novo Botão de Fotos */}
          <button 
            onClick={handleOpenGallery}
            className="col-span-2 flex items-center justify-between p-6 rounded-[32px] bg-[#10221c] dark:bg-white text-white dark:text-[#10221c] shadow-xl transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-3xl">photo_library</span>
              <div className="text-left">
                <p className="font-black text-lg leading-none">Fotos de Evolução</p>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Ver galeria de fotos</p>
              </div>
            </div>
            <span className="material-symbols-outlined opacity-30">chevron_right</span>
          </button>

          <button 
            onClick={() => onAction('chat')}
            className="col-span-2 flex items-center justify-between p-6 rounded-[32px] bg-white dark:bg-surface-dark border-2 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-3xl text-primary">chat_bubble</span>
              <div className="text-left">
                <p className="font-black text-lg leading-none">Abrir Chat</p>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Conversar com Aluno</p>
              </div>
            </div>
            <span className="material-symbols-outlined opacity-30">arrow_forward_ios</span>
          </button>
        </section>

        {/* Zona de Gerenciamento */}
        <section className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-8">
          <div className="bg-orange-500/5 rounded-[40px] p-8 text-center border-2 border-orange-500/10">
            <h3 className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Gerenciamento</h3>
            
            <button 
              onClick={handleRequestInactivation}
              disabled={isDeleting}
              className="w-full h-16 rounded-2xl bg-orange-500 text-white font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-orange-500/20 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isDeleting ? (
                <div className="flex items-center gap-3">
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">{deleteStep}</span>
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined">block</span>
                  INATIVAR ALUNO
                </>
              )}
            </button>
            <p className="text-[10px] text-gray-400 mt-4 font-bold uppercase tracking-tight leading-relaxed">
              O aluno perderá o acesso ao app e sairá da sua lista, mas o histórico de treinos será mantido.
            </p>
          </div>
        </section>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE INATIVAÇÃO */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowConfirmModal(false)}></div>
          <div className="relative w-full max-w-sm bg-white dark:bg-surface-dark rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col items-center text-center">
              <div className="size-16 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center mb-4 text-orange-500">
                <span className="material-symbols-outlined text-3xl">warning</span>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Tem certeza?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-6">
                Você está prestes a inativar <strong>{student.name}</strong>. Ele não poderá mais acessar o aplicativo.
              </p>
              
              <div className="grid grid-cols-2 gap-3 w-full">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmInactivation}
                  className="h-12 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-colors"
                >
                  Sim, Inativar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GALERIA DE FOTOS */}
      {showGallery && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setShowGallery(false)}></div>
           <div className="relative w-full max-w-lg h-[90vh] sm:h-[80vh] bg-background-light dark:bg-background-dark rounded-t-[40px] sm:rounded-[40px] p-0 shadow-2xl animate-in slide-in-from-bottom-10 overflow-hidden flex flex-col">
              
              <header className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-surface-dark shrink-0">
                 <h3 className="text-xl font-black">Evolução</h3>
                 <button onClick={() => setShowGallery(false)} className="size-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                   <span className="material-symbols-outlined text-sm">close</span>
                 </button>
              </header>

              {/* TAB SWITCHER */}
              <div className="px-6 pt-4 shrink-0 bg-white dark:bg-surface-dark">
                <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                  <button 
                    onClick={() => setGalleryTab('photos')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${galleryTab === 'photos' ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-gray-400'}`}
                  >
                    Galeria
                  </button>
                  <button 
                    onClick={() => setGalleryTab('comparisons')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${galleryTab === 'comparisons' ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-gray-400'}`}
                  >
                    Comparativos
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                 {loadingPhotos ? (
                    <div className="h-full flex items-center justify-center">
                       <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                 ) : (
                    <>
                      {galleryTab === 'photos' && (
                        photos.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center opacity-40">
                             <span className="material-symbols-outlined text-5xl mb-2">no_photography</span>
                             <p className="font-bold text-sm">Sem fotos.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                             {photos.map(p => (
                                <div key={p.id} className="group relative aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                   <img src={p.photo_url} className="w-full h-full object-cover" alt="Progresso" />
                                   <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent">
                                      <p className="text-white text-[10px] font-black uppercase">{new Date(p.created_at).toLocaleDateString()}</p>
                                   </div>
                                </div>
                             ))}
                          </div>
                        )
                      )}

                      {galleryTab === 'comparisons' && (
                        comparisons.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center opacity-40">
                             <span className="material-symbols-outlined text-5xl mb-2">compare_arrows</span>
                             <p className="font-bold text-sm">Sem comparativos.</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {comparisons.map(c => (
                              <div key={c.id}>
                                <div className="mb-2 text-[10px] font-black uppercase text-gray-400">{new Date(c.created_at).toLocaleDateString()}</div>
                                <BeforeAfterSlider beforeUrl={c.before_url} afterUrl={c.after_url} />
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetail;
