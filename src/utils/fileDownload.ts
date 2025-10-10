/**
 * Utility functions for downloading files from Supabase storage with correct filename and MIME type.
 * Handles forced download for HTML, CSV, TXT, etc. and provides error handling.
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * Internal helper to handle the actual file download process
 */
async function handleDownload(
  data: Blob,
  mimeType: string,
  storagePath: string,
  customFilename?: string
): Promise<void> {
  const originalFilename = extractFilenameFromPath(storagePath);
  const extMatch = originalFilename.match(/\.[^.]+$/);
  const ext = extMatch ? extMatch[0] : '';
  const safeCustom = customFilename ? sanitizeFilename(customFilename) : undefined;
  const filename = safeCustom ? `${safeCustom}${ext}` : originalFilename;

  // Force download for specific file types
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
}

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
/**
 * Downloads a file from Supabase storage, forcing download for certain types.
 *
 * Bucket must be either 'report-attachments' or 'payment-proofs'.
 * storagePath is the relative path to the file inside the bucket (e.g. 'user-id/abc.pdf').
 * customFilename is optional and preserves the original extension.
 */
export async function downloadFileFromStorage(
  bucket: string,
  storagePath: string,
  customFilename?: string
): Promise<void> {
  try {
    // Validate storagePath
    if (!storagePath || typeof storagePath !== 'string' || storagePath.trim() === '') {
      throw new Error('Storage path is required and cannot be empty');
    }

    // If storagePath is a full HTTP(S) URL, fetch it directly and download
    const isFullUrl = /^https?:\/\//i.test(storagePath);
    if (isFullUrl) {
      const response = await fetch(storagePath);
      if (!response.ok) throw new Error(`Failed to fetch URL: ${response.statusText}`);
      const blobData = await response.blob();
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      // Pass customFilename through; handleDownload will sanitize centrally
      return handleDownload(blobData, contentType, storagePath, customFilename);
    }

    // Validate bucket name
    if (!['report-attachments', 'payment-proofs'].includes(bucket)) {
      throw new Error(`Invalid bucket: ${bucket}. Expected 'report-attachments' or 'payment-proofs'`);
    }

    // First try public URL
    const { data: publicData } = await supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    // If public URL exists, try to fetch it first
    if (publicData?.publicUrl) {
      const response = await fetch(publicData.publicUrl);
      if (response.ok) {
        const data = await response.blob();
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        // handleDownload will sanitize customFilename
        return handleDownload(data, contentType, storagePath, customFilename);
      }
    }

    // Fallback to direct download using Supabase storage.download
    const { data, error } = await supabase.storage.from(bucket).download(storagePath);
    if (error || !data) {
      // If direct download fails, try signed URL as last resort
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 3600);
      
      if (signedError || !signedData?.signedUrl) {
        throw new Error(signedError?.message || 'File not found');
      }

      const response = await fetch(signedData.signedUrl);
      if (!response.ok) throw new Error('Failed to download file');
      const blobData = await response.blob();
      // handleDownload will sanitize customFilename
      return handleDownload(blobData, response.headers.get('content-type') || 'application/octet-stream', storagePath, customFilename);
    }

    // data may already be a Blob or ArrayBuffer-like
    const originalFilename = extractFilenameFromPath(storagePath);
    const extMatch = originalFilename.match(/\.[^.]+$/);
    const ext = extMatch ? extMatch[0] : '';
  const safeCustom = customFilename ? sanitizeFilename(customFilename) : undefined;
  const filename = safeCustom ? `${safeCustom}${ext}` : originalFilename;

    let blobData: Blob;
    if (data instanceof Blob) {
      blobData = data as Blob;
    } else {
      // create a Blob from returned data (handle common types)
      const unknownData = data as unknown;
      if (unknownData instanceof Blob) {
        blobData = unknownData as Blob;
      } else if (unknownData instanceof ArrayBuffer) {
        blobData = new Blob([unknownData], { type: 'application/octet-stream' });
      } else if (isArrayBufferView(unknownData)) {
        // TypedArray like Uint8Array
        const view = unknownData as ArrayBufferView;
        // Ensure we pass a Uint8Array to Blob to avoid SharedArrayBuffer issues
        const uint8 = new Uint8Array(view.buffer as ArrayBuffer);
        blobData = new Blob([uint8], { type: 'application/octet-stream' });
      } else {
        // Fallback: stringify
        const str = typeof unknownData === 'string' ? unknownData : JSON.stringify(unknownData);
        blobData = new Blob([str], { type: 'application/octet-stream' });
      }
    }

    const mimeType = blobData.type || 'application/octet-stream';
  return handleDownload(blobData, mimeType, storagePath, safeCustom ?? undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Download failed from ${bucket}/${storagePath}: ${message}`);
  }
}

/**
 * Sanitize a filename by removing unsafe characters and trimming length.
 * Replaces characters that are problematic in file systems with underscores.
 */
export function sanitizeFilename(name: string): string {
  // Remove path separators, control chars and other unsafe chars
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Limit length to 100 characters to be safe
  return base.substring(0, 100);
}

function isArrayBufferView(v: unknown): v is ArrayBufferView {
  if (!v || typeof v !== 'object') return false;
  const rec = v as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(rec, 'buffer')) return false;
  const buf = rec['buffer'];
  return buf instanceof ArrayBuffer;
}
