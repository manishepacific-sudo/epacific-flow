import React, { useMemo, useState, useCallback, useRef } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ReportFilePreviewProps {
  fileUrl: string;
  fileType?: string;
  className?: string;
}

type SupportedPreviewType = "pdf" | "image" | "unsupported";

function detectFileType(url: string | undefined | null): SupportedPreviewType {
  if (!url || typeof url !== "string") return "unsupported";

  try {
    // Strip query/hash to reliably detect extension
    const cleanUrl = url.split("?")[0].split("#")[0];
    const match = cleanUrl.match(/\.([^.\/]+)$/i);
    const ext = match?.[1]?.toLowerCase();
    if (!ext) return "unsupported";

    const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"];
    if (ext === "pdf") return "pdf";
    if (imageExts.includes(ext)) return "image";
    return "unsupported";
  } catch {
    return "unsupported";
  }
}

async function getFullFileUrl(rawUrl: string): Promise<string> {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  // Treat http(s), blob and data URLs as pass-through
  const isPassThrough = /^(https?:|blob:|data:)/i.test(rawUrl);
  if (isPassThrough) return rawUrl;

  // Default bucket for report files
  const bucket = "report-attachments";

  try {
    // Try public URL first
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(rawUrl);
    const publicUrl = publicData?.publicUrl;
    if (publicUrl) {
      try {
        // Probe accessibility; HEAD can be blocked, fall back to GET if needed
        const headResponse = await fetch(publicUrl, { method: "HEAD" });
        if (headResponse.ok) return publicUrl;
      } catch {
        // Ignore and try signed URL fallback
      }

      // Fallback to signed URL if public URL is not accessible
      const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(rawUrl, 3600);
      if (signedData?.signedUrl) return signedData.signedUrl;
      // If signed URL isn't available, return publicUrl as last resort
      return publicUrl;
    }

    // If no public URL, try signed URL directly
    const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(rawUrl, 3600);
    if (signedData?.signedUrl) return signedData.signedUrl;
  } catch {
    // Swallow and fall through to raw URL
  }

  // As a last resort, return the raw path (may still work if caller knows how to handle it)
  return rawUrl;
}

export function ReportFilePreview({ fileUrl, fileType, className }: ReportFilePreviewProps) {
  const [loadError, setLoadError] = useState<boolean>(false);
  const [fullUrl, setFullUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const pdfLoadTimeoutRef = useRef<number | null>(null);

  const effectiveType: SupportedPreviewType = useMemo(() => {
    if (fileType) {
      const normalized = fileType.toLowerCase();
      if (normalized.includes("pdf")) return "pdf";
      if (/(image|jpg|jpeg|png|gif|bmp|webp|svg)/.test(normalized)) return "image";
      return "unsupported";
    }
    return detectFileType(fileUrl);
  }, [fileType, fileUrl]);

  React.useEffect(() => {
    let isMounted = true;
    setLoadError(false);
    setIsLoading(true);
    (async () => {
      try {
        const url = await getFullFileUrl(fileUrl);
        if (isMounted) {
          setFullUrl(url);
        }
      } catch {
        if (isMounted) setLoadError(true);
      }
      if (isMounted) setIsLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [fileUrl]);

  const handleOpenNewTab = useCallback(() => {
    if (!fullUrl) return;
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  }, [fullUrl]);

  const showUnsupported = loadError || effectiveType === "unsupported";

  // When displaying a PDF, set a timeout to detect loading failures
  React.useEffect(() => {
    // Clear any existing timeout
    if (pdfLoadTimeoutRef.current) {
      window.clearTimeout(pdfLoadTimeoutRef.current);
      pdfLoadTimeoutRef.current = null;
    }
    if (effectiveType === "pdf" && fullUrl && !loadError) {
      pdfLoadTimeoutRef.current = window.setTimeout(() => {
        setLoadError(true);
      }, 12000);
    }
    return () => {
      if (pdfLoadTimeoutRef.current) {
        window.clearTimeout(pdfLoadTimeoutRef.current);
        pdfLoadTimeoutRef.current = null;
      }
    };
  }, [effectiveType, fullUrl]);

  return (
    <GlassCard hover={false} className={cn("p-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-lg font-semibold">File Preview</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleOpenNewTab} aria-label="View full size file">
          <ExternalLink className="mr-2 h-4 w-4" />
          View Full Size
        </Button>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="animate-pulse h-[300px] rounded-lg bg-muted/30 border border-border" />
        ) : showUnsupported ? (
          <div className="p-8 rounded-lg border border-border bg-muted/30 text-center flex flex-col items-center justify-center gap-3">
            <AlertCircle className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium">Preview Not Available</p>
              <p className="text-sm text-muted-foreground">This file type cannot be previewed. Click 'View Full Size' to download or open the file.</p>
            </div>
          </div>
        ) : effectiveType === "pdf" ? (
          <div className="relative">
            <iframe
              src={fullUrl}
              title="PDF Preview"
              loading="lazy"
              className="w-full h-[600px] rounded-lg border border-border"
              onLoad={() => {
                if (pdfLoadTimeoutRef.current) {
                  window.clearTimeout(pdfLoadTimeoutRef.current);
                  pdfLoadTimeoutRef.current = null;
                }
              }}
              onError={() => setLoadError(true)}
            />
          </div>
        ) : (
          <div className="flex justify-center">
            <img
              src={fullUrl}
              alt="Report file preview"
              loading="lazy"
              className="w-full max-h-[600px] object-contain rounded-lg border border-border bg-muted/30"
              onError={() => setLoadError(true)}
            />
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export default ReportFilePreview;


