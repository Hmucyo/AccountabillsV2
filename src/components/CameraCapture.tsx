import { useState, useRef, useEffect } from 'react';
import { X, Camera, RotateCw, Check, ImageIcon } from 'lucide-react';

interface CameraCaptureProps {
  onClose: () => void;
  onCapture: (mediaUrl: string, isVideo: boolean) => void;
}

export function CameraCapture({ onClose, onCapture }: CameraCaptureProps) {
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Start camera when component mounts
    startCamera();

    // Cleanup function to stop camera when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err: any) {
      // Silently handle camera errors with user-friendly messages
      // Only log non-permission errors for debugging
      if (err.name !== 'NotAllowedError') {
        console.error('Camera error:', err.name);
      }
      
      // Provide user-friendly error messages
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings, or use the upload option below.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device. Please use the upload option below.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is already in use by another application. Please close other apps and try again.');
      } else {
        setError('Unable to access camera. Please use the upload option below.');
      }
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to data URL
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedMedia(imageDataUrl);
        
        // Stop camera stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setCapturedMedia(reader.result as string);
        
        // Stop camera stream if running
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setCapturedMedia(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedMedia) {
      onCapture(capturedMedia, false);
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button onClick={handleClose} className="text-white p-2">
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-white">Capture Purchase</h3>
        <div className="w-10"></div>
      </div>

      {/* Camera View / Preview */}
      <div className="flex-1 flex items-center justify-center bg-gray-900 overflow-hidden relative">
        {capturedMedia ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={capturedMedia}
              alt="Captured"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        ) : error ? (
          <div className="text-center text-white p-8">
            <Camera className="w-24 h-24 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-sm bg-[#9E89FF] text-white py-3 rounded-xl hover:bg-[#8B76F0] transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <ImageIcon className="w-5 h-5" />
              <span>Upload from Gallery</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom Controls */}
      <div className="p-6 bg-black bg-opacity-50">
        {capturedMedia ? (
          <div className="flex gap-3">
            <button
              onClick={handleRetake}
              className="flex-1 bg-white bg-opacity-20 text-white py-4 rounded-xl hover:bg-opacity-30 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCw className="w-5 h-5" />
              <span>Retake</span>
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 bg-[#9E89FF] text-white py-4 rounded-xl hover:bg-[#8B76F0] transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>Use This</span>
            </button>
          </div>
        ) : (
          <div className="flex justify-center gap-8 items-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-colors"
            >
              <ImageIcon className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={handleCapture}
              disabled={!stream}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
            >
              <div className="w-16 h-16 bg-[#9E89FF] rounded-full"></div>
            </button>
            <div className="w-12 h-12"></div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  );
}