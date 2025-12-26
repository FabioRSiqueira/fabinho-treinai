import { createClient } from '@supabase/supabase-js';

// Valores padrão para garantir funcionamento imediato
const DEFAULT_URL = 'https://rdwgeefswosgarjeswtb.supabase.co';
const DEFAULT_KEY = 'sb_publishable_F9hHilt821FYYmBOagk-yQ_eNhx3WY2';

// Função para obter valor seguro
const getEnv = (key: string, fallback: string) => {
  // @ts-ignore
  const val = (typeof process !== 'undefined' && process.env?.[key]) || (import.meta.env?.[key]);
  return (val && val.length > 5) ? val : fallback;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL', DEFAULT_URL);
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY', DEFAULT_KEY);

// O createClient exige uma URL que comece com http
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
