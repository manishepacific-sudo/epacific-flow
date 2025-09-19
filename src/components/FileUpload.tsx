import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, CheckCircle, X, FileText, Code } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { parseReport } from '@/utils/reportParser';

interface ParsedData {
  total: number;
  preview: any[];
  headers: string[];
  filename: string;
}

interface FileUploadProps {
  onFileParsed?: (data: ParsedData) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
}

export function FileUpload({ 
  onFileParsed, 
  acceptedFileTypes = ['.csv', '.html', '.htm'],
  maxFileSize = 20 * 1024 * 1024 // 20MB
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    const file = acceptedFiles[0];
    
    if (!file) return;

    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExtension)) {
      setError(`Unsupported file type. Please upload ${acceptedFileTypes.join(', ')} files only.`);
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      setError(`File size too large. Maximum size is ${Math.round(maxFileSize / (1024 * 1024))}MB.`);
      return;
    }

    setUploadedFiles([file]);
    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 20, 90));
      }, 200);

      const result = await parseReport(file);
      
      clearInterval(progressInterval);
      setProcessingProgress(100);
      
      const parsedResult: ParsedData = {
        total: result.total,
        preview: result.preview,
        headers: result.headers,
        filename: file.name
      };
      
      setParsedData(parsedResult);
      onFileParsed?.(parsedResult);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingProgress(0), 1000);
    }
  }, [acceptedFileTypes, maxFileSize, onFileParsed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/html': ['.html', '.htm'],
    },
    maxFiles: 1,
    multiple: false
  });

  const removeFile = () => {
    setUploadedFiles([]);
    setParsedData(null);
    setError(null);
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension === 'csv' ? FileText : Code;
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300
          ${isDragActive 
            ? 'border-primary bg-primary/5 scale-105' 
            : 'border-border hover:border-primary/50 hover:bg-accent/50'
          }
        `}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          
          {isDragActive ? (
            <div>
              <h3 className="text-lg font-semibold text-primary">Drop your file here!</h3>
              <p className="text-muted-foreground">Release to upload</p>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold">Upload Report File</h3>
              <p className="text-muted-foreground">
                Drag and drop your CSV or HTML file here, or click to browse
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Supported formats: {acceptedFileTypes.join(', ')} • Max size: {Math.round(maxFileSize / (1024 * 1024))}MB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="text-sm font-medium">Processing file...</span>
          </div>
          <Progress value={processingProgress} className="h-2" />
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.map((file, index) => {
        const FileIcon = getFileIcon(file.name);
        return (
          <Card key={`${file.name}-${index}`} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent rounded-lg">
                  <FileIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {parsedData && (
                  <Badge variant="secondary" className="bg-success text-success-foreground">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Processed
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="h-8 w-8 p-0 hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Parsed Data Preview */}
      {parsedData && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Parsed Results</h3>
            <Badge variant="secondary" className="bg-success text-success-foreground">
              <CheckCircle className="h-4 w-4 mr-2" />
              Successfully Parsed
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-accent/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-primary">₹{parsedData.total.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-accent/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Records Found</p>
              <p className="text-2xl font-bold">{parsedData.preview.length}</p>
            </div>
          </div>

          {/* Data Preview Table */}
          <div className="space-y-3">
            <h4 className="font-medium">Data Preview</h4>
            <div className="overflow-x-auto">
              <table className="w-full border border-border rounded-lg">
                <thead>
                  <tr className="bg-accent/50">
                    {parsedData.headers.slice(0, 4).map((header, index) => (
                      <th key={index} className="p-3 text-left text-sm font-medium border-r border-border last:border-r-0">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.preview.slice(0, 3).map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-border last:border-b-0">
                      {parsedData.headers.slice(0, 4).map((header, colIndex) => (
                        <td key={colIndex} className="p-3 text-sm border-r border-border last:border-r-0">
                          {row[header] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedData.preview.length > 3 && (
              <p className="text-sm text-muted-foreground">
                Showing 3 of {parsedData.preview.length} records
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}