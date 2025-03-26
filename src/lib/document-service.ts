import { supabase, authQuery } from './supabase';
import { getCurrentSession } from './auth-service';

export interface Document {
  id: string;
  title: string;
  content: string;
  project_id?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/**
 * Create a new document
 * This function properly authenticates the user and creates a document in the database
 */
export async function createDocument(data: { 
  title: string; 
  content: string; 
  projectId?: string | null;
}): Promise<{ document: Document | null; error: string | null }> {
  const session = getCurrentSession();
  const userId = session?.user_id;
  
  if (!userId) {
    return { 
      document: null, 
      error: 'Authentication required to create documents' 
    };
  }
  
  try {
    console.log('Creating document with user ID:', userId);
    
    // Use the authQuery helper that adds the auth token
    const { data: documentData, error } = await authQuery
      .from('documents')
      .insert([
        {
          title: data.title,
          content: data.content,
          project_id: data.projectId || null,
          created_by: userId
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating document:', error);
      
      // Provide a more detailed error message
      if (error.message.includes('row-level security')) {
        return { 
          document: null, 
          error: 'Permission denied: You don\'t have permission to create documents. Please check your authentication.' 
        };
      }
      
      return { document: null, error: error.message };
    }
    
    console.log('Document created successfully:', documentData);
    return { document: documentData as Document, error: null };
  } catch (err) {
    console.error('Error in createDocument:', err);
    return { 
      document: null, 
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * Update an existing document
 */
export async function updateDocument(id: string, data: {
  title?: string;
  content?: string;
  projectId?: string | null;
}): Promise<{ document: Document | null; error: string | null }> {
  const session = getCurrentSession();
  const userId = session?.user_id;
  
  if (!userId) {
    return { 
      document: null, 
      error: 'Authentication required to update documents' 
    };
  }
  
  try {
    console.log('Updating document:', id);
    
    const updates = {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.projectId !== undefined && { project_id: data.projectId }),
      updated_at: new Date().toISOString()
    };
    
    const { data: documentData, error } = await authQuery
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating document:', error);
      
      if (error.message.includes('row-level security')) {
        return { 
          document: null, 
          error: 'Permission denied: You don\'t have permission to update this document.' 
        };
      }
      
      return { document: null, error: error.message };
    }
    
    console.log('Document updated successfully:', documentData);
    return { document: documentData as Document, error: null };
  } catch (err) {
    console.error('Error in updateDocument:', err);
    return { 
      document: null, 
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * Get a document by ID
 */
export async function getDocument(id: string): Promise<{ document: Document | null; error: string | null }> {
  try {
    const { data, error } = await authQuery
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching document:', error);
      return { document: null, error: error.message };
    }
    
    return { document: data as Document, error: null };
  } catch (err) {
    console.error('Error in getDocument:', err);
    return { 
      document: null, 
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * Get all documents for the current user
 */
export async function getUserDocuments(): Promise<{ documents: Document[]; error: string | null }> {
  const session = getCurrentSession();
  const userId = session?.user_id;
  
  if (!userId) {
    return { 
      documents: [], 
      error: 'Authentication required to fetch documents' 
    };
  }
  
  try {
    const { data, error } = await authQuery
      .from('documents')
      .select('*')
      .eq('created_by', userId)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user documents:', error);
      return { documents: [], error: error.message };
    }
    
    return { documents: data as Document[] || [], error: null };
  } catch (err) {
    console.error('Error in getUserDocuments:', err);
    return { 
      documents: [], 
      error: err instanceof Error ? err.message : String(err)
    };
  }
} 