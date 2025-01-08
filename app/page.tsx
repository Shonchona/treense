"use client";

import { Camera, Upload, RefreshCw } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MODEL_URL = "https://teachablemachine.withgoogle.com/models/nnIutkP_g/";

declare global {
  interface Window {
    tmImage: any;
  }
}

interface TreeRecord {
  _id: string;
  treeId: string;
  imageUrl: string;
  healthStatus: 'healthy' | 'unhealthy';
  timestamp: string;
  predictions: Array<{ className: string; probability: number }>;
}

const debugImageUpload = async (file: File) => {
  console.group('Image Upload Debug');
  console.log('File details:', {
    name: file.name,
    type: file.type,
    size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
  });
  
  if (file.size > 15 * 1024 * 1024) {
    console.warn('⚠️ Image size exceeds 15MB limit');
  }
  console.groupEnd();
};

const debugPrediction = (predictions: any[]) => {
  console.group('Prediction Debug');
  console.log('Raw predictions:', predictions);
  console.log('Highest confidence prediction:', 
    predictions.reduce((prev, current) => 
      (prev.probability > current.probability) ? prev : current
    )
  );
  console.groupEnd();
};

export default function Home() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Array<{ className: string; probability: number }>>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [model, setModel] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [history, setHistory] = useState<TreeRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    initModel();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/admin/trees');
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setHistory(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch history:', error);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  const initModel = async () => {
    try {
      const modelURL = MODEL_URL + "model.json";
      const metadataURL = MODEL_URL + "metadata.json";
      const loadedModel = await window.tmImage.load(modelURL, metadataURL);
      setModel(loadedModel);
    } catch (error) {
      console.error("Failed to load model:", error);
    }
  };

  const saveToDatabase = async (imageData: string, status: string, predictions: any[]) => {
    try {
      // Add request debugging
      console.log('Sending request with data size:', 
        `Image: ${imageData.length} chars, ` +
        `Status: ${status}, ` +
        `Predictions: ${predictions.length} items`
      );

      const response = await fetch('/api/admin/trees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          treeId: `tree-${Date.now()}`,
          imageUrl: imageData.split(',')[1],
          healthStatus: status.toLowerCase(),
          timestamp: new Date().toISOString(),
          predictions: predictions.map(p => ({
            className: String(p.className),
            probability: Number(p.probability)
          }))
        })
      });

      // Log response status and headers
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers));

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Save failed:', error);
      throw error;
    }
  };
  
  
  const predictImage = async (imageElement: HTMLImageElement | HTMLVideoElement) => {
    if (!model) {
      console.error('❌ Model not loaded');
      return;
    }
    
    try {
      console.log('🔄 Starting image analysis...');
      const predictions = await model.predict(imageElement);
      setPredictions(predictions);
      debugPrediction(predictions);
      
      const highestPrediction = predictions.reduce((prev: any, current: any) => 
        (prev.probability > current.probability) ? prev : current
      );
      
      setAnalysisResult(highestPrediction.className);
      console.log('✅ Analysis result:', highestPrediction.className);
    } catch (error) {
      console.error("❌ Prediction failed:", error);
      setAnalysisResult("Error in analysis");
    }
  };

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const switchCamera = async () => {
    setFacingMode(current => current === 'user' ? 'environment' : 'user');
  };

  useEffect(() => {
    if (showCamera) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode, showCamera]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        console.log('🔄 Starting file upload process...');
        await debugImageUpload(file);

        const reader = new FileReader();
        reader.onloadend = () => {
          const imageData = reader.result as string;
          console.log('✅ Image loaded successfully');
          setCapturedImage(imageData);
          
          const img = new Image();
          img.src = imageData;
          img.onload = () => {
            console.log('🖼️ Image dimensions:', {
              width: img.width,
              height: img.height
            });
            predictImage(img);
          };
        };
        reader.onerror = (error) => {
          console.error('❌ File reading failed:', error);
          throw new Error('Failed to read file');
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('❌ Error processing file:', error);
      }
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        if (facingMode === 'user') {
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
        } else {
          ctx.drawImage(videoRef.current, 0, 0);
        }
      }
      
      const imageData = canvas.toDataURL("image/jpeg");
      setCapturedImage(imageData);
      setShowCamera(false);
      
      // Create an image element for prediction
      const img = new Image();
      img.src = imageData;
      img.onload = () => predictImage(img);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-400 to-green-700 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <Card className="p-6 bg-white/90 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-center mb-6">Plant Health Analysis</h1>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 h-auto py-4"
              variant="outline"
            >
              <Upload className="h-6 w-6" />
              <span>Upload Image</span>
            </Button>
            
            <Button
              onClick={() => {
                setCapturedImage(null);
                setShowCamera(true);
              }}
              className="flex flex-col items-center gap-2 h-auto py-4"
              variant="outline"
            >
              <Camera className="h-6 w-6" />
              <span>Take Photo</span>
            </Button>
          </div>

          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />

          {showCamera && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full rounded-lg ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <Button onClick={switchCamera} variant="secondary">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Switch Camera
                </Button>
                <Button onClick={captureImage}>
                  Capture
                </Button>
              </div>
            </div>
          )}

          {capturedImage && (
            <div className="space-y-4">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full rounded-lg"
              />
              {analysisResult && (
                <>
                  <div className={`p-4 rounded-lg text-center font-bold ${
                    analysisResult.toLowerCase().includes("healthy") 
                      ? "bg-green-100 text-green-800" 
                      : "bg-rose-100 text-rose-900"
                  }`}>
                    Status: {analysisResult}
                  </div>
                  
                  <Button 
                    className="w-full"
                    onClick={async () => {
                      if (!capturedImage || !analysisResult || !predictions.length) {
                        console.error('Missing required data for saving');
                        setSaveSuccess(false);
                        return;
                      }

                      try {
                        setIsSaving(true);
                        setSaveSuccess(null);
                        
                        console.log('Starting save with:', {
                          imagePresent: !!capturedImage,
                          status: analysisResult,
                          predictionsCount: predictions.length
                        });

                        const result = await saveToDatabase(
                          capturedImage,
                          analysisResult,
                          predictions
                        );
                        
                        console.log('Save completed:', result);
                        setSaveSuccess(true);
                        
                        // Refresh history after successful save
                        const historyResponse = await fetch('/api/admin/trees');
                        const historyData = await historyResponse.json();
                        if (historyData.success && Array.isArray(historyData.data)) {
                          setHistory(historyData.data);
                        }
                      } catch (error) {
                        console.error('Failed to save:', error);
                        setSaveSuccess(false);
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving || !analysisResult}
                    variant={saveSuccess ? "default" : "secondary"}
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Saving...
                      </span>
                    ) : saveSuccess ? (
                      <span className="text-green-600">✓ Saved</span>
                    ) : (
                      "Save Analysis"
                    )}
                  </Button>

                  {saveSuccess === false && (
                    <p className="text-sm text-red-500 text-center">
                      Failed to save analysis. Please try again.
                    </p>
                  )}
                </>
              )}
              {predictions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Detailed Analysis:</h3>
                  {predictions.map((prediction, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span>{prediction.className}:</span>
                      <span className="font-mono">
                        {(prediction.probability * 100).toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
        
        <Card className="p-6 bg-white/90 backdrop-blur-sm">
          <h2 className="text-xl font-bold mb-4">Recent Analysis History</h2>
          <div className="space-y-4">
            {history.slice(0, 5).map((record) => (
              <div 
                key={record._id} 
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img 
                      src={`data:image/jpeg;base64,${record.imageUrl}`}
                      alt={`Tree ${record.treeId}`}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div>
                      <p className="text-sm text-gray-500">
                        {new Date(record.timestamp).toLocaleString()}
                      </p>
                      <Badge
                        variant={record.healthStatus === 'healthy' ? 'default' : 'destructive'}
                        className="mt-1"
                      >
                        {record.healthStatus}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {record.predictions.map((pred, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{pred.className}:</span>
                      <span>{(pred.probability * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <p className="text-center text-gray-500">
                No analysis history available
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}