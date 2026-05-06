import { supabase } from './config/database';

async function test() {
  const { data, error } = await supabase.from('customers').select('count');
  if (error) {
    console.error('❌ Error de conexión a Supabase:', error.message);
  } else {
    console.log('✅ Conexión exitosa. Base de datos lista.');
  }
}
test();