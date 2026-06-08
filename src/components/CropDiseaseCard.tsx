import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, Trash, Sparkles, CheckSquare, ShieldAlert, BookOpen, Activity, FileText, AlertTriangle, RefreshCw } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { LanguageCode } from "../types";
import { syncDiseaseReportToSupabase } from "../supabase";

interface CropDiseaseCardProps {
  language: LanguageCode;
  userId: string;
}

/**
 * High-performance client-side image compression helper using Canvas
 */
const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height); // Avoid transparent background glitches
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

export default function CropDiseaseCard({ language, userId }: CropDiseaseCardProps) {
  const [selectedCrop, setSelectedCrop] = useState("Wheat");
  const [useCamera, setUseCamera] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [diagnosis, setDiagnosis] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Safely stop any running camera streams to prevent memory leaks and green lights on unmount
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn("Failed to stop track:", e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Clean trigger for camera media
  const handleStartCamera = async () => {
    try {
      setErrorMsg(null);
      setDiagnosis(null);
      setPreviewUrl(null);
      setBase64Image(null);
      setUseCamera(true);

      // Wait for React to render video node, then initialize stream
      setTimeout(async () => {
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment" },
              audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play();
            }
          } else {
            throw new Error("WebRTC media device captures are not supported on this browser.");
          }
        } catch (err: any) {
          console.error("Camera access failed:", err);
          setErrorMsg(
            language === "pa"
              ? "ਕੈਮਰਾ ਵਰਤਣ ਦੀ ਆਗਿਆ ਨਹੀਂ ਮਿਲੀ। ਕਿਰਪਾ ਕਰਕੇ ਫਾਈਲ ਅਪਲੋਡ ਦੀ ਵਰਤੋਂ ਕਰੋ।"
              : language === "hi"
              ? "कैमरा एक्सेस नहीं हो सका। कृपया फ़ाइल अपलोड सेवा का उपयोग करें।"
              : "Iframe block or device privacy settings prevented camera access. Switched to secure file uploads instead."
          );
          setUseCamera(false);
        }
      }, 150);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to launch camera.");
      setUseCamera(false);
    }
  };

  const handleCancelCamera = () => {
    stopCameraStream();
    setUseCamera(false);
  };

  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setPreviewUrl(dataUrl);

        // Compress and prepare background base64
        setScanning(true);
        compressImage(dataUrl, 840, 840).then((compressed) => {
          setBase64Image(compressed);
          setScanning(false);
        }).catch(() => {
          setBase64Image(dataUrl);
          setScanning(false);
        });
        
        stopCameraStream();
        setUseCamera(false);
      }
    }
  };

  const processFile = (file: File) => {
    if (file) {
      // Compatibility validate structure
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setErrorMsg(
          language === "pa"
            ? "ਕਿਰਪਾ ਕਰਕੇ ਸਿਰਫ JPEG, PNG, ਜਾਂ WebP ਚਿੱਤਰ ਫਾਰਮੈਟ ਅਪਲੋਡ ਕਰੋ।"
            : language === "hi"
            ? "कृपया केवल JPEG, PNG, या WebP मुख्य छवि अपलोड करें।"
            : "Invalid file type. Please upload a standard leaf photo (JPEG, PNG, or WebP)."
        );
        return;
      }

      setErrorMsg(null);
      setScanning(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        setPreviewUrl(result);
        try {
          // Efficiently scale down image inside client thread
          const compressed = await compressImage(result, 840, 840);
          setBase64Image(compressed);
          setDiagnosis(null);
        } catch (err: any) {
          setErrorMsg("Compression error: " + err.message);
          setBase64Image(result);
        } finally {
          setScanning(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Support responsive Drag and Drop files
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const clearImage = () => {
    setErrorMsg(null);
    setPreviewUrl(null);
    setBase64Image(null);
    setDiagnosis(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyzeCrop = async () => {
    if (!base64Image) return;

    setScanning(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/gemini/disease-detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Image,
          cropType: selectedCrop,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "The remote agricultural pathogen engine is temporarily unresponsive.");
      }

      const reportData = await response.json();
      
      // Compress record image even lower to avoid exceeding Firestore 1MB row quota limit
      const dbUrlString = await compressImage(base64Image, 250, 250).catch(() => "https://picsum.photos/300");

      const reportId = "rep_" + Date.now();
      const firebaseRecord = {
        id: reportId,
        userId,
        cropType: reportData.cropType || selectedCrop,
        imageUrl: dbUrlString,
        diseaseName: reportData.diseaseName || "Leaf Pathology Spot",
        confidence: reportData.confidence || 0.85,
        causes: reportData.causes || "",
        symptoms: reportData.symptoms || [],
        prevention: reportData.prevention || "",
        treatment: reportData.treatment || "",
        createdAt: new Date().toISOString(),
        isFallback: !!reportData.isFallback,
        fallbackReason: reportData.fallbackReason || ""
      };

      try {
        await setDoc(doc(db, "diseaseReports", reportId), firebaseRecord);
      } catch (err) {
        // Safe console report error, still display results cleanly in UI if Firestore write failed (e.g. offline simulation profiles)
        console.warn("Firestore save skipped:", err);
        try {
          handleFirestoreError(err, OperationType.WRITE, `diseaseReports/${reportId}`);
        } catch (_) {}
      }

      // Sync to Supabase in background
      try {
        syncDiseaseReportToSupabase({
          id: reportId,
          userId,
          cropType: firebaseRecord.cropType,
          imageUrl: firebaseRecord.imageUrl,
          diseaseName: firebaseRecord.diseaseName,
          confidence: firebaseRecord.confidence,
          causes: firebaseRecord.causes,
          symptoms: firebaseRecord.symptoms,
          prevention: firebaseRecord.prevention,
          treatment: firebaseRecord.treatment,
          createdAt: firebaseRecord.createdAt
        });
      } catch (e) {
        console.warn("Supabase save quiet bypass:", e);
      }

      setDiagnosis(firebaseRecord);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(
        language === "pa"
          ? "ਏਆਈ ਵਿਸ਼ਲੇਸ਼ਣ ਅਸਫਲ ਰਿਹਾ। ਨੈਟਵਰਕ ਦੀ ਜਾਂਚ ਕਰੋ।"
          : language === "hi"
          ? "विश्लेषण पूरा नहीं किया जा सका, कृपया इंटरनेट और नेटवर्क जांचें।"
          : e.message || "Failed to process crop leaf details."
      );
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-emerald-100 flex flex-col h-full" id="crop_disease_card">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5" id="diag_header">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-emerald-600 w-5 h-5" />
            {language === "pa" ? "ਫਸਲ ਬਿਮਾਰੀ ਜਾਂਚ" : language === "hi" ? "फसल रोग पहचानकर्ता" : "Crop Disease Diagnosis"}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {language === "pa"
              ? "ਪ੍ਰਮੁੱਖ ਪੌਦਿਆਂ ਦੇ ਰੋਗਾਣੂਆਂ ਦਾ ਏਆਈ ਵਿਸ਼ਲੇਸ਼ਣ"
              : language === "hi"
              ? "पौधों के रोगाणुओं का उन्नत एआई प्रयोगशाला परीक्षण"
              : "Lab-grade pathogen detection via computer vision and AI"}
          </p>
        </div>

        {/* Selected Crop Filter */}
        <div className="flex items-center gap-2" id="crop_select_wrapper">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            {language === "pa" ? "ਫਸਲ" : language === "hi" ? "फसल चुनें" : "Crop"}:
          </label>
          <select
            value={selectedCrop}
            onChange={(e) => {
              setSelectedCrop(e.target.value);
              setDiagnosis(null);
              setErrorMsg(null);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700/90 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="Wheat">Wheat (ਕਣਕ/गेहूं)</option>
            <option value="Paddy">Paddy (ਝੋਨਾ/धान)</option>
            <option value="Mustard">Mustard (ਸਰ੍ਹੋਂ/सरसों)</option>
            <option value="Cotton">Cotton (ਨਰਮਾ/कपास)</option>
            <option value="Potato">Potato (ਆਲੂ/आलू)</option>
            <option value="Onion">Onion (ਪਿਆਜ਼/प्याज)</option>
          </select>
        </div>
      </div>

      {/* Screen Messages */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs font-medium flex flex-col gap-1 mb-4 relative" id="alert_box">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span>Diagnostic Alert</span>
          </div>
          <div className="pl-6">{errorMsg}</div>
          <button
            onClick={() => setErrorMsg(null)}
            className="absolute top-2 right-2 text-red-400 hover:text-red-700 font-bold p-1 transition-all"
            id="close_alert_btn"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1" id="diag_body">
        {/* Stage Card Left */}
        <div className="col-span-1 lg:col-span-5 flex flex-col justify-between space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center min-h-[300px] overflow-hidden flex-1 transition-all ${
              dragOver
                ? "border-emerald-500 bg-emerald-50/50 shadow-inner"
                : "border-slate-200 bg-slate-50/70 hover:bg-slate-100/40"
            }`}
            id="drag_drop_stage"
          >
            {useCamera ? (
              <div className="w-full relative flex flex-col items-center" id="active_camera_viewer">
                {/* Fixed camera mirroring: environment framing faces the back world, so omit negative scaling mirror view */}
                <video ref={videoRef} className="w-full h-56 md:h-64 rounded-xl object-cover bg-black" />
                
                <div className="flex gap-2.5 mt-3 justify-center w-full">
                  <button
                    onClick={handleCapturePhoto}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1"
                    id="capture_leaf_btn"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture (ਫੋਟੋ ਲਓ)</span>
                  </button>
                  
                  <button
                    onClick={handleCancelCamera}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-705 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    id="cancel_camera_btn"
                  >
                    Cancel
                  </button>
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
            ) : previewUrl ? (
              <div className="w-full h-full relative group flex flex-col justify-center" id="img_preview_stage">
                <img
                  src={previewUrl}
                  alt="Crop leaves preview"
                  className="w-full h-56 md:h-64 object-cover rounded-xl shadow-md border border-slate-200"
                  referrerPolicy="no-referrer"
                />
                
                <button
                  onClick={clearImage}
                  className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-full shadow-lg transition-all cursor-pointer hover:rotate-6"
                  title="Remove crop photo"
                  id="trash_leaf_btn"
                >
                  <Trash className="w-4 h-4" />
                </button>

                {scanning && (
                  <div className="absolute inset-0 bg-emerald-950/20 flex flex-col justify-center items-center backdrop-blur-[2px]">
                    <div className="w-full h-1 bg-emerald-400 absolute animate-pulse shadow-[0_0_12px_#10b981]"></div>
                    <div className="bg-emerald-800 text-white text-xs px-3.5 py-2 rounded-full font-bold shadow-md animate-bounce flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing Pathogens (ਰੋਗਾਂ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ)...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-4 flex flex-col items-center" id="empty_stage_prompt">
                <div className="text-slate-300 hover:text-slate-400 transition-colors flex justify-center mb-4">
                  <Upload className="w-12 h-12" />
                </div>
                
                <p className="text-sm font-bold text-slate-700 mb-1">
                  {language === "pa"
                    ? "ਪੱਤੇ/ਬੂਟੇ ਦੀ ਫੋਟੋ"
                    : language === "hi"
                    ? "पत्तियां या फसल के प्रभावित अंग की फोटो"
                    : "Upload leaf lesion spot"}
                </p>
                
                <p className="text-xs text-slate-400 mb-5 max-w-[200px] leading-relaxed mx-auto">
                  Drag and drop crop images here, upload files directly, or use camera
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  {/* File Upload Selector */}
                  <label className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-705 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-slate-300/40">
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>{language === "pa" ? "ਫਾਈਲ ਅਪਲੋਡ" : language === "hi" ? "फ़ाइल अपलोड" : "Upload File"}</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </label>

                  {/* Camera Launcher */}
                  <button
                    onClick={handleStartCamera}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                    id="trigger_camera_btn"
                  >
                    <Camera className="w-4 h-4 text-emerald-200" />
                    <span>{language === "pa" ? "ਕੈਮਰਾ ਚਲਾਓ" : language === "hi" ? "कैमरा चलाएं" : "Launch Camera"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleAnalyzeCrop}
            disabled={!base64Image || scanning}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-45 disabled:pointer-events-none text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            id="run_diagnosis_scan"
          >
            <Sparkles className="w-4.5 h-4.5 text-amber-300 animate-pulse" />
            <span>
              {language === "pa"
                ? "ਏਆਈ ਬਿਮਾਰੀ ਟੈਸਟ"
                : language === "hi"
                ? "एआई बीमारी निदान शुरू करें"
                : "Run Diagnostic Scan"}
            </span>
          </button>
        </div>

        {/* Results Card Right */}
        <div className="col-span-1 lg:col-span-7 bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-between min-h-[350px]" id="diagnostic_results_block">
          {diagnosis ? (
            <div className="space-y-4" id="diagnosis_report_panel">
              {/* Fallback Notice */}
              {diagnosis.isFallback && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-xl text-xs font-semibold flex flex-col gap-1 relative" id="fallback_banner">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <strong>Offline Pathogen Expert Activated</strong>
                  </div>
                  <p className="text-[11px] text-amber-750 font-normal leading-relaxed">
                    A real-time API drop was detected ({diagnosis.fallbackReason || "Connection limits"}). Your system recovered automatically using verified plant pathologist records for <strong>{selectedCrop}</strong>.
                  </p>
                </div>
              )}

              {/* Header metrics */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3" id="scores_summary">
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-700 select-none flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Ag-Lab Pathogen Diagnosis</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800">
                    {diagnosis.diseaseName}
                  </h3>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Confidence</div>
                  <div className="text-lg font-black text-emerald-600 flex items-center justify-end gap-1">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <span>{Math.round((diagnosis.confidence || 0) * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Pathology details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="details_grid">
                {/* Causes */}
                <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm transition-shadow hover:shadow">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5" id="cause_heading">
                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{language === "pa" ? "ਮੁੱਖ ਕਾਰਨ" : language === "hi" ? "बीमारी का मुख्य कारण" : "Root Cause"}</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                    {diagnosis.causes}
                  </p>
                </div>

                {/* Checked Symptoms */}
                <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm transition-shadow hover:shadow">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5" id="symptoms_heading">
                    <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{language === "pa" ? "ਪੱਤਿਆਂ 'ਤੇ ਲੱਛਣ" : language === "hi" ? "प्रभावित पत्तियों पर लक्षण" : "Visible Symptoms"}</span>
                  </h4>
                  <ul className="space-y-1" id="symptoms_list">
                    {diagnosis.symptoms?.map((symp: string, idx: number) => (
                      <li key={idx} className="text-xs text-slate-600 flex items-start gap-1">
                        <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✔</span>
                        <span className="font-medium text-slate-600/90">{symp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Preventions */}
              <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm transition-shadow hover:shadow">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5" id="prevention_heading">
                  <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{language === "pa" ? "ਬਚਾਅ ਦੇ ਤਰੀਕੇ" : language === "hi" ? "बचाव के तरीके (सावधानी)" : "Cultural Preventions"}</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  {diagnosis.prevention}
                </p>
              </div>

              {/* Treatments */}
              <div className="bg-emerald-50/70 border border-emerald-150 p-4 rounded-xl shadow-sm">
                <h4 className="text-xs font-bold text-emerald-850 flex items-center gap-1.5 mb-1.5" id="treatment_heading">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>{language === "pa" ? "ਇਲਾਜ ਦੇ ਰਸਾਇਣ (Kisan Recommendation)" : language === "hi" ? "दवा / रासायनिक मिश्रण उपचार" : "Chemical Prescriptions & Remedies"}</span>
                </h4>
                <p className="text-xs text-emerald-900 leading-relaxed font-bold">
                  {diagnosis.treatment}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center" id="results_placeholder">
              <div className="w-12 h-12 bg-slate-200 text-slate-400 p-3 rounded-full flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="font-bold text-slate-700 text-sm mb-1">
                {language === "pa"
                  ? "ਕੋਈ ਸਕੈਨ ਰਿਪੋਰਟ ਨਹੀਂ"
                  : language === "hi"
                  ? "कोई निदान रिपोर्ट सक्रिय नहीं है"
                  : "Active Diagnostics Offline"}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                {language === "pa"
                  ? "ਉੱਪਰ ਦਿੱਤੇ ਕੈਮਰੇ ਦੀ ਮਦਦ ਨਾਲ ਪੱਤੇ ਦੀ ਫੋਟੋ ਲਓ ਅਤੇ ਏਆਈ ਵਿਸ਼ਲੇਸ਼ਣ ਸ਼ੁਰੂ ਕਰੋ।"
                  : language === "hi"
                  ? "ऊपर दिए गए कैमरे की मदद से पत्ती की फोटो लें और एआई रोग निदान शुरू करें।"
                  : "Upload or snap a picture of diseased leaves to generate biological remedies."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
