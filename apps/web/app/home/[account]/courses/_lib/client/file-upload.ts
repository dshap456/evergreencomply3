import { useSupabase } from '@kit/supabase/hooks/use-supabase';

export async function uploadFileToSupabase(
  file: File, 
  folderPath: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // This is a client-side function that needs to be called from a component that has access to Supabase
  // We'll create a hook version below for better React integration
  
  const supabase = (window as any).__supabase_client__;
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${folderPath}/${fileName}`;

  // Simulate progress for now - Supabase doesn't provide upload progress by default
  const progressInterval = setInterval(() => {
    if (onProgress) {
      const progress = Math.min(90, Math.random() * 80 + 10);
      onProgress(progress);
    }
  }, 200);

  try {
    const { data, error } = await supabase.storage
      .from('course-content')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('course-content')
      .getPublicUrl(filePath);

    clearInterval(progressInterval);
    if (onProgress) {
      onProgress(100);
    }

    return urlData.publicUrl;
  } catch (error) {
    clearInterval(progressInterval);
    throw error;
  }
}

// React hook version for better integration
export function useFileUpload() {
  const supabase = useSupabase();

  const uploadFile = async (
    file: File, 
    folderPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;

    // Simulate progress updates
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress < 90 && onProgress) {
        onProgress(Math.min(90, progress));
      }
    }, 300);

    try {
      const { data, error } = await supabase.storage
        .from('course-content')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('course-content')
        .getPublicUrl(filePath);

      clearInterval(progressInterval);
      if (onProgress) {
        onProgress(100);
      }

      return urlData.publicUrl;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  };

  const deleteFile = async (filePath: string): Promise<void> => {
    const { error } = await supabase.storage
      .from('course-content')
      .remove([filePath]);

    if (error) {
      throw error;
    }
  };

  return { uploadFile, deleteFile };
}