import React, { useState, useRef } from "react";
import { Camera, Loader2, UserCircle2, AlertCircle } from "lucide-react";
import * as faceapi from "face-api.js";

const MODELS_URL = `${import.meta.env.BASE_URL}face-models`;
let modelLoadingPromise: Promise<void> | null = null;

async function ensureFaceModelLoaded(): Promise<void> {
  if (modelLoadingPromise) return modelLoadingPromise;
  modelLoadingPromise = faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL).catch((err) => {
    modelLoadingPromise = null;
    throw err;
  });
  return modelLoadingPromise;
}

async function detectFaceInDataUrl(dataUrl: string): Promise<boolean> {
  await ensureFaceModelLoaded();
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        const result = await faceapi.detectSingleFace(
          img,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
        );
        resolve(!!result);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function compressImage(file: File, maxSize = 400, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const TC = "#C14B2A";
const SAND = "#FAF6EF";
const BORDER = "#E8DDD0";

interface PhotoUploadProps {
  currentPhotoUrl?: string | null;
  onUpload: (dataUrl: string) => void;
  uploading?: boolean;
  size?: number;
  required?: boolean;
}

export function PhotoUpload({ currentPhotoUrl, onUpload, uploading, size = 80, required }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const photo = preview ?? currentPhotoUrl;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErrorMsg(null);
    setCompressing(true);
    try {
      const dataUrl = await compressImage(file);
      setCompressing(false);
      setValidating(true);
      const hasFace = await detectFaceInDataUrl(dataUrl);
      if (!hasFace) {
        setErrorMsg("Aucun visage détecté. Merci de prendre une photo claire de votre visage.");
        setValidating(false);
        return;
      }
      setPreview(dataUrl);
      onUpload(dataUrl);
    } catch {
      setErrorMsg("Impossible de traiter cette image. Réessayez.");
    } finally {
      setCompressing(false);
      setValidating(false);
    }
  };

  const isLoading = compressing || validating || uploading;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={!!isLoading}
        className="relative rounded-full overflow-hidden flex items-center justify-center border-2 transition-all active:scale-95"
        style={{
          width: size,
          height: size,
          borderColor: photo ? TC : required ? "#E53E3E" : BORDER,
          background: photo ? "transparent" : SAND
        }}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" style={{ width: size * 0.35, height: size * 0.35, color: TC }} />
        ) : photo ? (
          <img src={photo} alt="Photo de profil" className="w-full h-full object-cover" />
        ) : (
          <UserCircle2 style={{ width: size * 0.55, height: size * 0.55, color: required ? "#E53E3E" : "#C0AFA7" }} />
        )}
        <div
          className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white"
          style={{ background: TC }}
        >
          <Camera className="h-3.5 w-3.5 text-white" />
        </div>
      </button>
      {validating && (
        <p className="text-xs font-semibold" style={{ color: TC }}>Vérification du visage…</p>
      )}
      {errorMsg && (
        <div className="flex items-start gap-1.5 max-w-[220px]">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: "#E53E3E" }} />
          <p className="text-xs font-semibold leading-tight" style={{ color: "#E53E3E" }}>{errorMsg}</p>
        </div>
      )}
      {required && !photo && !errorMsg && !validating && (
        <p className="text-xs font-semibold text-red-500">Photo de visage obligatoire</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
