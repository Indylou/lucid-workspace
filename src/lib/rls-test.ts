import { supabase } from './supabase';

/**
 * Utility to test Row Level Security (RLS) policies
 */

// Test if the current user can insert into documents table
export async function testDocumentsInsert() {
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Current session:', session);
  
  try {
    // Test insert
    const { data, error } = await supabase
      .from('documents')
      .insert([
        {
          title: 'Test Document RLS',
          content: 'This is a test for RLS policies',
          created_by: session?.user?.id || 'anonymous'
        }
      ])
      .select();
    
    if (error) {
      console.error('Failed to insert test document:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Successfully inserted test document:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Error testing documents insert:', err);
    return { success: false, error: String(err) };
  }
}

// Check permissions for a table
export async function checkTablePermissions(tableName: string) {
  try {
    // Test SELECT permissions
    const { data: selectData, error: selectError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    // Test INSERT permissions (will not actually insert if there's an error)
    const { error: insertError } = await supabase
      .from(tableName)
      .insert([{}])
      .select()
      .abortSignal(new AbortController().signal);
    
    return {
      table: tableName,
      canSelect: !selectError,
      canInsert: !insertError || !insertError.message.includes('violates row-level security')
    };
  } catch (err) {
    console.error(`Error checking permissions for ${tableName}:`, err);
    return {
      table: tableName,
      error: String(err)
    };
  }
}

// Check all tables for permissions
export async function checkAllTablesPermissions() {
  const tables = ['documents', 'users', 'todos', 'projects'];
  const results = [];
  
  for (const table of tables) {
    results.push(await checkTablePermissions(table));
  }
  
  return results;
} 