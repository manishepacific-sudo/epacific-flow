/**
 * Utility functions for downloading files from Supabase storage with correct filename and MIME type.
 * Handles forced download for HTML, CSV, TXT, etc. and provides error handling.
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * Extracts the filename from a Supabase storage path.
 * @param storagePath - The path in storage (e.g., 'user-id/1234567890.html')
 * @returns The filename with extension, or a default if extraction fails
 */
export function extractFilenameFromPath(storagePath: string): string {
  if (!storagePath) return 'downloaded-file';
  const parts = storagePath.split('/');
  const filename = parts[parts.length - 1];
  return filename || 'downloaded-file';
}

/**
 * Determines if a file should be force-downloaded (not opened in browser).
 * @param filename - The filename to check
 * @returns True if file should be force-downloaded
 */
export function shouldForceDownload(filename: string): boolean {
  const forceExts = ['.html', '.htm', '.csv', '.txt'];
  const lower = filename.toLowerCase();
  return forceExts.some(ext => lower.endsWith(ext));
}

/**
 * Downloads a file from Supabase storage, forcing download for certain types.
 * @param bucket - Supabase storage bucket name
 * @param storagePath - Path to file in storage
 * @param customFilename - Optional custom filename (preserves original extension)
 */
export async function downloadFileFromStorage(
  bucket: string,
  storagePath: string,
  customFilename?: string
): Promise<void> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(storagePath);
    if (error || !data) throw new Error(error?.message || 'File not found');

    const originalFilename = extractFilenameFromPath(storagePath);
    const extMatch = originalFilename.match(/\.[^.]+$/);
    const ext = extMatch ? extMatch[0] : '';
    const filename = customFilename ? `${customFilename}${ext}` : originalFilename;

    let mimeType = data.type;
    if (shouldForceDownload(filename)) {
      mimeType = 'application/octet-stream';
    }
    const blob = new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
  } catch (err: any) {
    throw new Error(`Download failed: ${err.message || err}`);
  }
}
