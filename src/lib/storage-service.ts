import { supabase } from './supabase'
import { User } from './supabase'
import { v4 as uuidv4 } from 'uuid'

// Storage buckets enum
export enum StorageBucket {
  AVATARS = 'avatars',
  DOCUMENTS = 'documents',
  TODO_ATTACHMENTS = 'todo-attachments'
}

// File types
export interface StorageFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  createdAt: string
}

export interface DocumentFile {
  id: string
  documentId: string
  objectId: string
  displayName: string
  createdAt: string
  createdBy: string
  file: StorageFile
}

export interface UserAvatar {
  id: string
  userId: string
  objectId: string
  createdAt: string
  file: StorageFile
}

export interface TodoAttachment {
  id: string
  todoId: string
  objectId: string
  displayName: string
  createdAt: string
  createdBy: string
  file: StorageFile
}

/**
 * Generate a unique filename to prevent collisions
 * @param fileName Original filename
 * @returns Unique filename with UUID
 */
function generateUniqueFilename(fileName: string): string {
  const fileExt = fileName.split('.').pop() || ''
  const uniqueId = uuidv4().replace(/-/g, '')
  return `${uniqueId}.${fileExt}`
}

/**
 * Upload a file to a Supabase storage bucket
 * @param bucket Storage bucket to upload to
 * @param file File to upload
 * @param customFilename Optional custom filename
 * @returns Uploaded file information
 */
export async function uploadFile(
  bucket: StorageBucket,
  file: File,
  customFilename?: string
): Promise<{ data: StorageFile | null; error: string | null }> {
  try {
    // Generate a unique filename
    const fileName = customFilename || generateUniqueFilename(file.name)
    
    // Upload the file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return { data: null, error: uploadError.message }
    }
    
    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName)
    const publicUrl = urlData?.publicUrl || ''
    
    // Get file metadata from the storage.objects table
    const { data: objectData, error: objectError } = await supabase
      .from('storage.objects')
      .select('id, size, mime_type, created_at')
      .eq('bucket_id', bucket)
      .eq('name', fileName)
      .single()
    
    if (objectError || !objectData) {
      console.error('Error getting file metadata:', objectError)
      return { 
        data: {
          id: uploadData?.path || '',
          name: fileName,
          size: file.size,
          type: file.type,
          url: publicUrl,
          createdAt: new Date().toISOString()
        }, 
        error: null 
      }
    }
    
    return { 
      data: {
        id: objectData.id,
        name: fileName,
        size: objectData.size,
        type: objectData.mime_type,
        url: publicUrl,
        createdAt: objectData.created_at
      }, 
      error: null 
    }
  } catch (err) {
    console.error('Error uploading file:', err)
    return { data: null, error: 'An unexpected error occurred during file upload' }
  }
}

/**
 * Delete a file from a Supabase storage bucket
 * @param bucket Storage bucket to delete from
 * @param fileName Name of the file to delete
 * @returns Success status
 */
export async function deleteFile(
  bucket: StorageBucket,
  fileName: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([fileName])
    
    if (error) {
      console.error('Error deleting file:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, error: null }
  } catch (err) {
    console.error('Error deleting file:', err)
    return { success: false, error: 'An unexpected error occurred during file deletion' }
  }
}

/**
 * Upload a user avatar
 * @param userId User ID
 * @param file Avatar image file
 * @returns User avatar information
 */
export async function uploadUserAvatar(
  userId: string,
  file: File
): Promise<{ data: UserAvatar | null; error: string | null }> {
  try {
    // First upload the file to storage
    const { data: fileData, error: fileError } = await uploadFile(
      StorageBucket.AVATARS,
      file,
      `${userId}-${Date.now()}`
    )
    
    if (fileError || !fileData) {
      return { data: null, error: fileError }
    }
    
    // Create a user_avatars record
    const { data: avatarData, error: avatarError } = await supabase
      .from('user_avatars')
      .insert([
        {
          user_id: userId,
          object_id: fileData.id
        }
      ])
      .select('id, user_id, object_id, created_at')
      .single()
    
    if (avatarError || !avatarData) {
      console.error('Error creating avatar record:', avatarError)
      return { data: null, error: avatarError?.message || 'Error creating avatar record' }
    }
    
    // Update user's avatar_url
    await supabase
      .from('users')
      .update({ avatar_url: fileData.url })
      .eq('id', userId)
    
    return { 
      data: {
        id: avatarData.id,
        userId: avatarData.user_id,
        objectId: avatarData.object_id,
        createdAt: avatarData.created_at,
        file: fileData
      }, 
      error: null 
    }
  } catch (err) {
    console.error('Error uploading avatar:', err)
    return { data: null, error: 'An unexpected error occurred during avatar upload' }
  }
}

/**
 * Upload a document file attachment
 * @param documentId Document ID
 * @param file File to upload
 * @param displayName Display name for the file
 * @param userId User ID of the uploader
 * @returns Document file information
 */
export async function uploadDocumentFile(
  documentId: string,
  file: File,
  displayName: string,
  userId: string
): Promise<{ data: DocumentFile | null; error: string | null }> {
  try {
    // First upload the file to storage
    const { data: fileData, error: fileError } = await uploadFile(
      StorageBucket.DOCUMENTS,
      file
    )
    
    if (fileError || !fileData) {
      return { data: null, error: fileError }
    }
    
    // Create a document_files record
    const { data: docFileData, error: docFileError } = await supabase
      .from('document_files')
      .insert([
        {
          document_id: documentId,
          object_id: fileData.id,
          display_name: displayName || file.name,
          created_by: userId
        }
      ])
      .select('id, document_id, object_id, display_name, created_at, created_by')
      .single()
    
    if (docFileError || !docFileData) {
      console.error('Error creating document file record:', docFileError)
      return { data: null, error: docFileError?.message || 'Error creating document file record' }
    }
    
    return { 
      data: {
        id: docFileData.id,
        documentId: docFileData.document_id,
        objectId: docFileData.object_id,
        displayName: docFileData.display_name,
        createdAt: docFileData.created_at,
        createdBy: docFileData.created_by,
        file: fileData
      }, 
      error: null 
    }
  } catch (err) {
    console.error('Error uploading document file:', err)
    return { data: null, error: 'An unexpected error occurred during document file upload' }
  }
}

/**
 * Upload a todo attachment
 * @param todoId Todo ID
 * @param file File to upload
 * @param displayName Display name for the file
 * @param userId User ID of the uploader
 * @returns Todo attachment information
 */
export async function uploadTodoAttachment(
  todoId: string,
  file: File,
  displayName: string,
  userId: string
): Promise<{ data: TodoAttachment | null; error: string | null }> {
  try {
    // First upload the file to storage
    const { data: fileData, error: fileError } = await uploadFile(
      StorageBucket.TODO_ATTACHMENTS,
      file
    )
    
    if (fileError || !fileData) {
      return { data: null, error: fileError }
    }
    
    // Create a todo_attachments record
    const { data: attachmentData, error: attachmentError } = await supabase
      .from('todo_attachments')
      .insert([
        {
          todo_id: todoId,
          object_id: fileData.id,
          display_name: displayName || file.name,
          created_by: userId
        }
      ])
      .select('id, todo_id, object_id, display_name, created_at, created_by')
      .single()
    
    if (attachmentError || !attachmentData) {
      console.error('Error creating todo attachment record:', attachmentError)
      return { data: null, error: attachmentError?.message || 'Error creating todo attachment record' }
    }
    
    return { 
      data: {
        id: attachmentData.id,
        todoId: attachmentData.todo_id,
        objectId: attachmentData.object_id,
        displayName: attachmentData.display_name,
        createdAt: attachmentData.created_at,
        createdBy: attachmentData.created_by,
        file: fileData
      }, 
      error: null 
    }
  } catch (err) {
    console.error('Error uploading todo attachment:', err)
    return { data: null, error: 'An unexpected error occurred during todo attachment upload' }
  }
}

/**
 * Get document files for a document
 * @param documentId Document ID
 * @returns List of document files
 */
export async function getDocumentFiles(
  documentId: string
): Promise<{ data: DocumentFile[] | null; error: string | null }> {
  try {
    // Define response type to properly handle nested object
    type DocumentFileResponse = {
      id: string;
      document_id: string;
      object_id: string;
      display_name: string;
      created_at: string;
      created_by: string;
      "storage.objects": {
        id: string;
        name: string;
        size: number;
        mime_type: string;
        created_at: string;
      };
    };
    
    const { data, error } = await supabase
      .from('document_files')
      .select(`
        id, 
        document_id, 
        object_id, 
        display_name, 
        created_at, 
        created_by,
        storage.objects(id, name, size, mime_type, created_at)
      `)
      .eq('document_id', documentId);
    
    if (error) {
      console.error('Error fetching document files:', error);
      return { data: null, error: error.message };
    }
    
    // Cast data to our expected type
    const typedData = data as unknown as DocumentFileResponse[];
    
    const filesWithUrls = typedData.map(item => {
      const objectData = item["storage.objects"];
      const bucketName = StorageBucket.DOCUMENTS;
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(objectData.name);

      return {
        id: item.id,
        documentId: item.document_id,
        objectId: item.object_id,
        displayName: item.display_name,
        createdAt: item.created_at,
        createdBy: item.created_by,
        file: {
          id: objectData.id,
          name: objectData.name,
          size: objectData.size,
          type: objectData.mime_type,
          url: urlData?.publicUrl || '',
          createdAt: objectData.created_at
        }
      };
    });
    
    return { data: filesWithUrls, error: null };
  } catch (err) {
    console.error('Error fetching document files:', err);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Get todo attachments for a todo
 * @param todoId Todo ID
 * @returns List of todo attachments
 */
export async function getTodoAttachments(
  todoId: string
): Promise<{ data: TodoAttachment[] | null; error: string | null }> {
  try {
    // Define response type to properly handle nested object
    type TodoAttachmentResponse = {
      id: string;
      todo_id: string;
      object_id: string;
      display_name: string;
      created_at: string;
      created_by: string;
      "storage.objects": {
        id: string;
        name: string;
        size: number;
        mime_type: string;
        created_at: string;
      };
    };
    
    const { data, error } = await supabase
      .from('todo_attachments')
      .select(`
        id, 
        todo_id, 
        object_id, 
        display_name, 
        created_at, 
        created_by,
        storage.objects(id, name, size, mime_type, created_at)
      `)
      .eq('todo_id', todoId);
    
    if (error) {
      console.error('Error fetching todo attachments:', error);
      return { data: null, error: error.message };
    }
    
    // Cast data to our expected type
    const typedData = data as unknown as TodoAttachmentResponse[];
    
    const attachmentsWithUrls = typedData.map(item => {
      const objectData = item["storage.objects"];
      const bucketName = StorageBucket.TODO_ATTACHMENTS;
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(objectData.name);

      return {
        id: item.id,
        todoId: item.todo_id,
        objectId: item.object_id,
        displayName: item.display_name,
        createdAt: item.created_at,
        createdBy: item.created_by,
        file: {
          id: objectData.id,
          name: objectData.name,
          size: objectData.size,
          type: objectData.mime_type,
          url: urlData?.publicUrl || '',
          createdAt: objectData.created_at
        }
      };
    });
    
    return { data: attachmentsWithUrls, error: null };
  } catch (err) {
    console.error('Error fetching todo attachments:', err);
    return { data: null, error: 'An unexpected error occurred' };
  }
} 