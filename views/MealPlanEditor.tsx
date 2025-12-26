
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { generateMealPlan } from '../services/gemini';

interface FoodItem {
  id: string;
  name: string;
  amount: string;
  calories: number;
}

interface Meal {
  id: string;
  name: string;
  time: string;
  foods: FoodItem[];
}

interface MealPlanEditorProps {
  onBack: () => void;
  studentId: string | null;
  studentName?: string;
}

const MealPlanEditor: React.FC<MealPlanEditorProps> = ({ onBack, studentId, studentName }) => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [macros, setMacros] = useState({
    calories: 2000,
    protein: 160,
    carbs: 200,
    fat: 60
  });

  const [meals, setMeals] = useState<Meal[]>([]);

  // Buscar plano existente ao montar o componente
  useEffect(() => {
    const fetchExistingPlan = async () => {
      if (!studentId) return;
      setInitialLoading(true);
      try {
        // 1. Pegar o plano mais recente
        const { data: plan, error: pErr } = await supabase
          .from('meal_plans')
          .select('*')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pErr) throw pErr;

        if (plan) {
          setMacros({
            calories: plan.total_calories,
            protein: plan.protein,
            carbs: plan.carbs,
            fat: plan.fat
          });

          // 2. Pegar as refeições do plano
          const { data: mealsData, error: mErr } = await supabase
            .from('meals')
            .select('*, meal_foods(*)')
            .eq('meal_plan_id', plan.id)
            .order('order_index', { ascending: true });

          if (mErr) throw mErr;

          if (mealsData) {
            const formattedMeals: Meal[] = mealsData.map(m => ({
              id: m.id,
              name: m.name,
              time: m.time || '08:00',
              foods: (m.meal_foods || []).map((f: any) => ({
                id: f.id,
                name: f.food_name,
                amount: f.amount,
                calories: f.calories
              }))
            }));
            setMeals(formattedMeals);
          }
        }
      } catch (err: any) {
        console.error("Erro ao carregar dieta existente:", err);
        setError("Não foi possível carregar a dieta anterior.");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchExistingPlan();
  }, [studentId]);

  const addMeal = (defaultName = 'Nova Refeição') => {
    const id = Math.random().toString(36).substr(2, 9);
    setMeals([...meals, { id, name: defaultName, time: '08:00', foods: [] }]);
  };

  const removeMeal = (id: string) => {
    setMeals(meals.filter(m => m.id !== id));
  };

  const addFood = (mealId: string) => {
    const foodId = Math.random().toString(36).substr(2, 9);
    setMeals(meals.map(m => m.id === mealId ? {
      ...m,
      foods: [...m.foods, { id: foodId, name: '', amount: '', calories: 0 }]
    } : m));
  };

  const updateFood = (mealId: string, foodId: string, field: keyof FoodItem, value: any) => {
    setMeals(meals.map(m => m.id === mealId ? {
      ...m,
      foods: m.foods.map(f => f.id === foodId ? { ...f, [field]: value } : f)
    } : m));
  };

  const removeFood = (mealId: string, foodId: string) => {
    setMeals(meals.map(m => m.id === mealId ? {
      ...m,
      foods: m.foods.filter(f => f.id !== foodId)
    } : m));
  };

  const handleAiSuggest = async () => {
    setAiLoading(true);
    setError(null);
    try {
      const { data: student } = await supabase.from('profiles').select('*').eq('id', studentId).single();
      const info = `Aluno: ${student?.full_name}, Objetivo: ${student?.goal}, Peso: ${student?.weight}kg, Altura: ${student?.height}m`;
      const suggested = await generateMealPlan(info);
      setMacros({
        calories: suggested.calories || 2000,
        protein: suggested.protein || 160,
        carbs: suggested.carbs || 200,
        fat: suggested.fat || 60
      });
    } catch (err) {
      setError("Erro ao gerar sugestão com IA.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (meals.length === 0) return setError("Adicione ao menos uma refeição para o aluno.");
    if (meals.some(m => !m.name)) return setError("Todas as refeições precisam de um nome.");

    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const { data: plan, error: pErr } = await supabase
        .from('meal_plans')
        .insert({
          student_id: studentId,
          trainer_id: session.user.id,
          total_calories: macros.calories,
          protein: macros.protein,
          carbs: macros.carbs,
          fat: macros.fat
        })
        .select()
        .single();

      if (pErr) throw pErr;

      for (const [idx, m] of meals.entries()) {
        const { data: savedMeal, error: mErr } = await supabase
          .from('meals')
          .insert({
            meal_plan_id: plan.id,
            name: m.name,
            time: m.time,
            order_index: idx
          })
          .select()
          .single();

        if (mErr) throw mErr;

        if (m.foods.length > 0) {
          const foodPayload = m.foods.map(f => ({
            meal_id: savedMeal.id,
            food_name: f.name || 'Alimento',
            amount: f.amount || 'A gosto',
            calories: parseInt(f.calories.toString()) || 0
          }));
          await supabase.from('meal_foods').insert(foodPayload);
        }
      }

      onBack();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar dieta.");
    } finally {
      setLoading(false);
    }
  };

  const quickLabels = ['Café', 'Lanche', 'Almoço', 'Pré-Treino', 'Pós-Treino', 'Jantar', 'Ceia'];

  if (initialLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark text-primary">
        <div className="size-10 border-4 border-current border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Buscando dieta atual...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      <header className="sticky top-0 z-50 flex items-center bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md p-4 justify-between border-b shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h2 className="text-xs font-black uppercase text-primary">Plano Alimentar</h2>
            <p className="text-base font-bold truncate max-w-[150px]">{studentName || 'Aluno'}</p>
          </div>
        </div>
        <button 
          onClick={handleAiSuggest}
          disabled={aiLoading}
          className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
        >
          {aiLoading ? <div className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <span className="material-symbols-outlined text-[16px]">psychology</span>}
          IA Macros
        </button>
      </header>

      <main className="p-4 space-y-8 animate-in fade-in duration-500">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[11px] font-bold border border-red-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </div>
        )}

        {/* Metas Macros */}
        <section className="bg-white dark:bg-surface-dark rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-6 px-1">Metas Diárias</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Kcal Totais</label>
              <input 
                type="number" 
                className="w-full h-14 rounded-2xl border-0 bg-gray-50 dark:bg-gray-800/50 px-4 mt-1 font-black text-xl text-primary focus:ring-2 focus:ring-primary"
                value={macros.calories}
                onChange={e => setMacros({...macros, calories: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Proteína (g)</label>
              <input 
                type="number" 
                className="w-full h-12 rounded-xl border-0 bg-gray-50 dark:bg-gray-800/50 px-4 mt-1 font-bold text-blue-500 focus:ring-1 focus:ring-blue-500"
                value={macros.protein}
                onChange={e => setMacros({...macros, protein: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Carbos (g)</label>
              <input 
                type="number" 
                className="w-full h-12 rounded-xl border-0 bg-gray-50 dark:bg-gray-800/50 px-4 mt-1 font-bold text-primary focus:ring-1 focus:ring-primary"
                value={macros.carbs}
                onChange={e => setMacros({...macros, carbs: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
        </section>

        {/* Refeições Flexíveis */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 px-1">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest">Estrutura da Dieta</h3>
            <div className="flex flex-wrap gap-2">
              {quickLabels.map(label => (
                <button 
                  key={label}
                  onClick={() => addMeal(label)}
                  className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-800 px-3 py-1.5 rounded-full text-[10px] font-bold text-gray-500 hover:border-primary hover:text-primary transition-all"
                >
                  + {label}
                </button>
              ))}
              <button 
                onClick={() => addMeal()}
                className="bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-full text-[10px] font-black uppercase"
              >
                + Personalizada
              </button>
            </div>
          </div>

          {meals.length === 0 && (
            <div className="py-16 text-center bg-white/50 dark:bg-surface-dark/50 rounded-[32px] border-2 border-dashed border-gray-100 dark:border-gray-800">
              <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">restaurant</span>
              <p className="text-sm font-bold text-gray-400">Clique nos botões acima para<br/>definir as refeições do aluno.</p>
            </div>
          )}

          {meals.map((meal) => (
            <div key={meal.id} className="bg-white dark:bg-surface-dark rounded-[28px] border border-gray-100 dark:border-gray-800 p-5 shadow-sm space-y-4 animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <input 
                    className="w-full bg-transparent border-0 font-black text-lg p-0 focus:ring-0 placeholder:text-gray-300"
                    placeholder="Nome da Refeição..."
                    value={meal.name}
                    onChange={e => setMeals(meals.map(m => m.id === meal.id ? {...m, name: e.target.value} : m))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="time" 
                    className="bg-gray-50 dark:bg-gray-800/50 border-0 rounded-lg text-[11px] font-black p-1 w-16 focus:ring-1 focus:ring-primary"
                    value={meal.time}
                    onChange={e => setMeals(meals.map(m => m.id === meal.id ? {...m, time: e.target.value} : m))}
                  />
                  <button onClick={() => removeMeal(meal.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {meal.foods.map((food) => (
                  <div key={food.id} className="flex items-center gap-2 group">
                    <input 
                      placeholder="Alimento"
                      className="flex-1 bg-gray-50 dark:bg-gray-800/50 border-0 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                      value={food.name}
                      onChange={e => updateFood(meal.id, food.id, 'name', e.target.value)}
                    />
                    <input 
                      placeholder="Qnt"
                      className="w-20 bg-gray-50 dark:bg-gray-800/50 border-0 rounded-xl px-2 py-2 text-sm text-center focus:ring-1 focus:ring-primary"
                      value={food.amount}
                      onChange={e => updateFood(meal.id, food.id, 'amount', e.target.value)}
                    />
                    <button onClick={() => removeFood(meal.id, food.id)} className="text-gray-200 hover:text-red-400 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => addFood(meal.id)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-[10px] font-black uppercase text-gray-400 hover:bg-gray-50 hover:text-primary transition-all"
                >
                  + Adicionar Alimento
                </button>
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* Botão Salvar */}
      <div className="fixed bottom-0 left-0 w-full bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 p-4 z-50">
        <button 
          onClick={handleSave}
          disabled={loading || (meals.length === 0 && !initialLoading)}
          className="w-full bg-primary h-16 rounded-[24px] text-[#102216] font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? <div className="size-6 border-3 border-[#102216] border-t-transparent rounded-full animate-spin"></div> : "Salvar Plano Alimentar"}
        </button>
      </div>
    </div>
  );
};

export default MealPlanEditor;
