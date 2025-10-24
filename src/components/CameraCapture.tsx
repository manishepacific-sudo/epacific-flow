import { useState, useRef, useCallback } from 'react';
import { Camera, RotateCcw, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function CameraCapture({ onCapture, onClose, isOpen }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  }, [facingMode, toast]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `attendance-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        setIsCapturing(true);
        
        toast({
          title: "Photo Captured",
          description: "Review your photo and confirm or retake",
        });
      }
    }, 'image/jpeg', 0.8);
  }, [toast]);

  const confirmCapture = useCallback(() => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `attendance-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        
        onCapture(file);
        stopCamera();
        setCapturedImage(null);
        setIsCapturing(false);
        onClose();
      }
    }, 'image/jpeg', 0.8);
  }, [onCapture, stopCamera, onClose]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setIsCapturing(false);
  }, []);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // Start camera when component opens
  useState(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Take Attendance Photo</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isCapturing ? (
            <div className="space-y-4">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500">Starting camera...</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={switchCamera}
                  disabled={!stream}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  onClick={capturePhoto}
                  disabled={!stream}
                  className="bg-primary text-primary-foreground"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
                {capturedImage && (
                  <img
                    src={capturedImage}
                    alt="Captured attendance photo"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={retakePhoto}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button onClick={confirmCapture} className="bg-green-600 hover:bg-green-700">
                  <Check className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-500 text-center">
            <p>• Ensure your face is clearly visible</p>
            <p>• Take photo in good lighting</p>
            <p>• Keep the camera steady</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}



