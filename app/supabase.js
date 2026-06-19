import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uxtsuagcuyjspyhyhxdz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dHN1YWdjdXlqc3B5aHloeGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NDc4NDUsImV4cCI6MjA5NzQyMzg0NX0.6zGWM782kE2HezROUA646wc9AGxVg0VyumvdnbvtYDM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
