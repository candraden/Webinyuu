import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../../config/env.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);