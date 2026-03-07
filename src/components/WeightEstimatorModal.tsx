import type React from 'react'
import {
  useState, useRef, useEffect, useCallback,
} from 'react'
import {
  Camera, Upload, X, Loader2, CheckCircle,
  AlertCircle, Scale, RefreshCw,
} from 'lucide-react'

declare global {
  interface Window {
    puter?: {
      auth: { isSignedIn: () => boolean; signIn: () => Promise<void> }
      ai: { chat: (prompt: string, image: string | File, options?: { model?: string; temperature?: number }) => Promise<{ message?: { content?: string }; text?: string } | string> }
    }
  }
}

function getPuter() {
  if (typeof window === 'undefined' || !window.puter) return null
  return window.puter
}

// ══════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════

export interface WeightResult {
  is_crop_waste: boolean
  rejection_reason?: string
  estimated_tonnes: number
  confidence: 'High' | 'Medium' | 'Low'
  confidence_percent: number
  crop_type_detected: string
  estimated_dimensions: {
    length_m: number
    width_m: number
    height_m: number
  }
  bulk_density_used: number
  volume_m3: number
  reasoning: string
  scale_references: string
  range: {
    min_tonnes: number
    max_tonnes: number
  }
}

export interface WeightEstimatorModalProps {
  isOpen?: boolean
  cropType?: string
  /** Preferred: pass weight in kg; parent sets quantity = (kg/1000).toFixed(3) */
  onApplyWeight?: (weightKg: number) => void
  /** Legacy: pass tonnes (used if onApplyWeight not provided) */
  onApply?: (tonnes: number) => void
  onClose: () => void
  /** Crop key e.g. 'paddy_husk' for API */
  wasteType?: string
  /** Human label e.g. 'Paddy Husk' for display */
  wasteLabel?: string
}

type Props = WeightEstimatorModalProps

type Mode =
  | 'idle' | 'camera' | 'preview'
  | 'compressing' | 'analyzing' | 'result' | 'error' | 'applied'

type ModelStatus =
  | 'loading' | 'ready' | 'failed'

/** Unified result from Puter vision (GPT-4o/Gemini) or fallback */
export interface UnifiedWeightResult {
  estimatedWeightKg: number
  weightRangeMin: number
  weightRangeMax: number
  confidencePercent: number
  method: string
  reasoning: string
  source: 'puter_gpt4o' | 'puter_gemini' | 'tfjs'
  cropTypeDetected?: string
  cropTypeConfirmed?: boolean
  qualityGrade?: string
  warnings?: string
}

const DENSITY_TABLE: Record<string, { bulk: number; packed: number }> = {
  paddy_husk: { bulk: 120, packed: 180 },
  wheat_straw: { bulk: 80, packed: 140 },
  corn_stalks: { bulk: 95, packed: 150 },
  sugarcane_bagasse: { bulk: 150, packed: 240 },
  coconut_shells: { bulk: 480, packed: 600 },
}

function compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      if (!ctx) {
        reject(new Error('No canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = URL.createObjectURL(file)
  })
}

interface PuterEstimateResult {
  estimatedWeightKg: number
  weightRangeMin: number
  weightRangeMax: number
  confidencePercent: number
  method: string
  reasoning: string
  source?: string
  cropTypeDetected?: string
  cropTypeConfirmed?: boolean
  qualityGrade?: string
  warnings?: string
}

async function estimateWithPuter(
  imageFile: File,
  wasteType: string,
  model: string = 'gpt-4o'
): Promise<PuterEstimateResult & { source: string; modelUsed?: string }> {
  const density = DENSITY_TABLE[wasteType] ?? DENSITY_TABLE.paddy_husk
  const wasteLabel = wasteType.replace(/_/g, ' ')
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(String(e.target?.result ?? ''))
    reader.onerror = () => reject(new Error('FileReader failed'))
    reader.readAsDataURL(imageFile)
  })
  const prompt = `You are an expert agricultural weight estimation AI.
Analyse this image of ${wasteLabel} crop waste.

TASK: Estimate total weight using this priority order:
1. OCR — Read ANY visible text: bag labels ("50 KG"),
   weighbridge displays, scale readings, truck markings.
   If weight numbers found → use as PRIMARY source.
2. COUNT — Count visible bags/bales/bundles.
   Standard Indian sack: 50kg. Small: 25kg. Large jute: 100kg.
   Multiply count × standard weight.
3. GEOMETRY — Estimate pile dimensions vs reference objects
   (person=1.7m, door=2m, car=1.5m tall).
   Apply bulk density ${density.bulk}–${density.packed} kg/m³
4. FALLBACK — If none above: typical small Indian farm lot
   of ${wasteLabel} = 300–800kg.

Known bulk density for ${wasteLabel}:
  Loose: ${density.bulk} kg/m³  |  Packed: ${density.packed} kg/m³

Return ONLY this JSON (no markdown, no explanation):
{
  "estimatedWeightKg": <number>,
  "weightRangeMin": <number>,
  "weightRangeMax": <number>,
  "confidencePercent": <number 60-95>,
  "method": <"ocr"|"counting"|"geometry"|"fallback">,
  "ocrFound": <boolean>,
  "ocrText": <string>,
  "bagCount": <number>,
  "packingDensity": <"loose"|"moderate"|"packed">,
  "referenceObject": <string>,
  "reasoning": <string: 2 sentences>,
  "cropConfirmed": <boolean>,
  "qualityGrade": <"A"|"B"|"C">,
  "warnings": <string>
}`

  const puter = getPuter()
  if (!puter) throw new Error('Puter not loaded. Refresh the page.')
  const response = await puter.ai.chat(prompt, dataUrl, { model, temperature: 0.1 })
  const text = typeof response === 'string'
    ? response
    : (response?.message?.content ?? response?.text ?? '')
  const clean = String(text).replace(/```json|```/g, '').trim()
  const result = JSON.parse(clean) as PuterEstimateResult
  const sourceKey = model.includes('gemini') ? 'puter_gemini' : 'puter_gpt4o'
  return { ...result, source: sourceKey, modelUsed: model }
}

const PUTER_MODELS = ['gpt-4o', 'google/gemini-2.5-flash', 'claude-sonnet-4-5']
const ESTIMATE_TIMEOUT_MS = 8000

async function estimateWithBestModel(imageFile: File, wasteType: string): Promise<PuterEstimateResult & { source: string; modelUsed?: string }> {
  for (const model of PUTER_MODELS) {
    try {
      const result = await Promise.race([
        estimateWithPuter(imageFile, wasteType, model),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), ESTIMATE_TIMEOUT_MS)
        ),
      ])
      return result
    } catch (err) {
      console.warn(`${model} failed, trying next...`, err)
      continue
    }
  }
  throw new Error('All AI models failed. Try again or use a different image.')
}

const ANALYSIS_STEPS = [
  'Scanning for text and labels...',
  'Detecting bags, bales, bundles...',
  'Estimating pile dimensions...',
  'Calculating bulk density...',
  'Finalising weight estimate...',
]

// ══════════════════════════════════════════════
// COMPONENT (Puter.js vision — client-side, no API keys)
// ══════════════════════════════════════════════

export default function WeightEstimatorModal({
  cropType,
  onApplyWeight,
  onApply,
  onClose,
  wasteType: wasteTypeProp,
  wasteLabel,
}: Props) {
  const wasteTypeKey = (wasteTypeProp || cropType || 'paddy_husk').replace(/\s+/g, '_').toLowerCase()
  const displayCrop = wasteLabel || cropType || 'Paddy Husk'
  const [mode, setMode] = useState<Mode>('idle')
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [pileArea, setPileArea] = useState('')
  const [unifiedResult, setUnifiedResult] = useState<UnifiedWeightResult | null>(null)
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0)
  const [error, setError] = useState('')
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [modelStatus, setModelStatus] = useState<ModelStatus>(getPuter() ? 'ready' : 'loading')
  const [pendingStream, setPendingStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    if (modelStatus !== 'loading') return
    const t = setInterval(() => {
      if (getPuter()) {
        setModelStatus('ready')
        clearInterval(t)
      }
    }, 200)
    return () => clearInterval(t)
  }, [modelStatus])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Attach stream when camera mode active
  useEffect(() => {
    if (
      mode === 'camera'
      && pendingStream
      && videoRef.current
    ) {
      const video = videoRef.current
      video.srcObject = pendingStream
      video.onloadedmetadata = () => {
        video.play().catch((err) => {
          console.error('Video play:', err)
          setError('Camera failed to start.')
          setMode('error')
        })
      }
      streamRef.current = pendingStream
      setPendingStream(null)
    }
  }, [mode, pendingStream])

  useEffect(() => () => {
    streamRef.current?.getTracks()
      .forEach((t) => t.stop())
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks()
      .forEach((t) => t.stop())
    streamRef.current = null
    setPendingStream(null)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const reset = useCallback(() => {
    stopCamera()
    setMode('idle')
    setPreviewUrl('')
    setImageFile(null)
    setUnifiedResult(null)
    setError('')
    setPileArea('')
    setShowBreakdown(false)
  }, [stopCamera])

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Use under 10MB.')
      setMode('error')
      return
    }
    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setMode('preview')
    setError('')
    e.target.value = ''
  }

  const startCamera = async () => {
    setError('')
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
    } catch {
      try {
        stream = await navigator.mediaDevices
          .getUserMedia({
            video: true, audio: false,
          })
      } catch {
        setError(
          'Camera denied. Use Upload instead.',
        )
        setMode('error')
        return
      }
    }
    setPendingStream(stream)
    setMode('camera')
  }

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const W = video.videoWidth || 1280
    const H = video.videoHeight || 720
    canvas.width = W
    canvas.height = H
    canvas.getContext('2d')!
      .drawImage(video, 0, 0, W, H)
    stopCamera()
    canvas.toBlob((blob) => {
      if (!blob) {
        setError('Capture failed.')
        setMode('idle')
        return
      }
      const file = new File(
        [blob],
        `capture_${Date.now()}.jpg`,
        { type: 'image/jpeg' },
      )
      setImageFile(file)
      setPreviewUrl(URL.createObjectURL(blob))
      setError('')
      setMode('preview')
    }, 'image/jpeg', 0.92)
  }

  const handleAnalyze = async () => {
    if (!imageFile) return
    setError('')
    setUnifiedResult(null)

    const puter = getPuter()
    if (!puter) {
      setError('Puter is not loaded. Refresh the page and try again.')
      setMode('error')
      return
    }
    if (!puter.auth.isSignedIn()) {
      setMode('analyzing')
      setAnalysisStepIndex(0)
      try {
        await puter.auth.signIn()
      } catch (e) {
        setError('Sign in with Puter is required for AI weight estimation (free, ~10 seconds).')
        setMode('error')
        return
      }
    }

    setMode('compressing')
    let compressedBlob: Blob
    try {
      compressedBlob = await compressImage(imageFile, 1200, 0.85)
    } catch (e) {
      setError('Image compression failed.')
      setMode('error')
      return
    }
    const compressedFile = new File([compressedBlob], 'crop.jpg', { type: 'image/jpeg' })

    setMode('analyzing')
    setAnalysisStepIndex(0)
    const stepTicker = setInterval(() => {
      setAnalysisStepIndex((i) => Math.min(i + 1, ANALYSIS_STEPS.length - 1))
    }, 600)

    try {
      const data = await estimateWithBestModel(compressedFile, wasteTypeKey)
      clearInterval(stepTicker)
      setUnifiedResult({
        estimatedWeightKg: data.estimatedWeightKg ?? 0,
        weightRangeMin: data.weightRangeMin ?? 0,
        weightRangeMax: data.weightRangeMax ?? 0,
        confidencePercent: data.confidencePercent ?? 75,
        method: data.method ?? 'combined',
        reasoning: data.reasoning ?? '',
        source: (data.source === 'puter_gemini' ? 'puter_gemini' : 'puter_gpt4o'),
        cropTypeDetected: data.cropTypeDetected,
        cropTypeConfirmed: data.cropTypeConfirmed,
        qualityGrade: data.qualityGrade,
        warnings: data.warnings,
      })
      setMode('result')
    } catch (err) {
      clearInterval(stepTicker)
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg === 'timeout') {
        setError('AI request timed out. Please try again.')
      } else if (msg.includes('Puter not loaded')) {
        setError('Puter is not loaded. Refresh the page and try again.')
      } else if (msg.includes('All AI models failed')) {
        setError('All AI models failed. Try again or use a different image.')
      } else {
        setError(msg || 'AI weight estimation failed. Try again.')
      }
      setMode('error')
    }
  }

  const handleApply = () => {
    const kg = unifiedResult?.estimatedWeightKg ?? 0
    const tonnes = kg / 1000
    if (kg <= 0) return
    if (onApplyWeight) {
      onApplyWeight(kg)
    } else if (onApply) {
      onApply(tonnes)
    }
    setMode('applied')
    setTimeout(() => onClose(), 800)
  }

  const statusText = {
    loading: '⏳ Loading...',
    ready: '⚡ Puter AI Vision (free, no API keys)',
    failed: '⚠ Vision unavailable',
  }[modelStatus]

  return (
    <div
      className="fixed inset-0 z-50 flex
                 items-center justify-center p-4
                 bg-black/65 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera(); onClose()
        }
      }}
    >
      <div className="bg-white rounded-2xl
                      shadow-2xl w-full max-w-lg
                      flex flex-col overflow-hidden
                      max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center
                        justify-between px-5 py-4
                        border-b border-gray-100
                        shrink-0"
        >
          <div className="flex items-center
                          gap-2.5"
          >
            <div className="p-2 bg-green-100
                            rounded-xl"
            >
              <Scale size={18}
                className="text-green-700"
              />
            </div>
            <div>
              <h2 className="font-bold text-gray-900
                             text-sm"
              >
                Estimate Weight via Camera
              </h2>
              <p className="text-xs text-gray-500">
                {statusText}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera(); onClose()
            }}
            className="p-1.5 hover:bg-gray-100
                       rounded-lg transition-colors"
          >
            <X size={17}
              className="text-gray-500"
            />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto
                        p-5 space-y-4"
        >

          {/* IDLE */}
          {mode === 'idle' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600
                            text-center"
              >
                Upload or capture a crop waste
                photo for AI weight estimation
              </p>

              <div className="bg-amber-50 border
                              border-amber-200
                              rounded-xl p-3"
              >
                <p className="text-xs font-semibold
                              text-amber-800 mb-1.5"
                >
                  📸 For best accuracy:
                </p>
                <ul className="text-xs text-amber-700
                               space-y-1"
                >
                  <li>
                    • Photograph the full pile
                    outdoors
                  </li>
                  <li>
                    • Include a person/vehicle
                    for scale
                  </li>
                  <li>
                    • Good lighting,
                    no motion blur
                  </li>
                  <li>
                    • Angle shot — not top-down
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex flex-col
                             items-center gap-2 p-4
                             border-2 border-dashed
                             border-green-300
                             rounded-xl
                             hover:bg-green-50
                             transition-colors"
                >
                  <Camera size={26}
                    className="text-green-600"
                  />
                  <span className="text-sm
                                   font-medium
                                   text-gray-700"
                  >
                    Use Camera
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col
                             items-center gap-2 p-4
                             border-2 border-dashed
                             border-blue-300
                             rounded-xl
                             hover:bg-blue-50
                             transition-colors"
                >
                  <Upload size={26}
                    className="text-blue-600"
                  />
                  <span className="text-sm
                                   font-medium
                                   text-gray-700"
                  >
                    Upload Photo
                  </span>
                </button>
              </div>

              <div>
                <label className="text-xs
                                  font-medium
                                  text-gray-600"
                >
                  Pile area (optional — improves
                  accuracy)
                </label>
                <div className="mt-1 flex items-center
                                border border-gray-300
                                rounded-lg
                                overflow-hidden
                                focus-within:ring-2
                                focus-within:ring-green-500"
                >
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g. 12"
                    value={pileArea}
                    onChange={(e) => setPileArea(e.target.value)}
                    className="flex-1 px-3 py-2
                               text-sm outline-none
                               border-none bg-white
                               [appearance:textfield]
                               [&::-webkit-outer-spin-button]:appearance-none
                               [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="px-3 py-2
                                   bg-gray-50
                                   border-l
                                   border-gray-300
                                   text-xs
                                   text-gray-500"
                  >
                    m²
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CAMERA */}
          {mode === 'camera' && (
            <div className="space-y-3">
              <div
                className="relative rounded-xl
                              overflow-hidden bg-black"
                style={{ aspectRatio: '16/9' }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full
                             object-cover block"
                />
                <div className="absolute inset-0
                                flex items-center
                                justify-center
                                pointer-events-none"
                >
                  <div className="w-4/5 h-4/5
                                  border-2
                                  border-white/50
                                  border-dashed
                                  rounded-xl"
                  />
                </div>
                <div className="absolute top-3 left-3
                                flex items-center
                                gap-1.5 bg-black/60
                                rounded-full
                                px-2.5 py-1"
                >
                  <div className="w-2 h-2 bg-red-500
                                  rounded-full
                                  animate-pulse"
                  />
                  <span className="text-white
                                   text-xs
                                   font-medium"
                  >
                    LIVE
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera()
                    setMode('idle')
                  }}
                  className="py-2.5 border
                             border-gray-300
                             text-gray-700 text-sm
                             font-medium rounded-xl
                             hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="py-2.5 bg-green-600
                             hover:bg-green-700
                             text-white text-sm
                             font-bold rounded-xl
                             flex items-center
                             justify-center gap-2"
                >
                  <Camera size={15} />
                  Capture
                </button>
              </div>
            </div>
          )}

          {/* PREVIEW */}
          {mode === 'preview' && (
            <div className="space-y-4">
              <div className="relative rounded-xl
                              overflow-hidden"
              >
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full max-h-64
                             object-contain
                             bg-gray-100
                             rounded-xl"
                />
                <button
                  type="button"
                  onClick={reset}
                  className="absolute top-2 right-2
                             p-1.5 bg-black/60
                             hover:bg-black/80
                             text-white rounded-lg"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
              <div className="flex items-center
                                gap-2 bg-green-50
                                border border-green-200
                                rounded-lg
                                px-3 py-2"
                >
                  <span className="text-xs text-green-700">🌾 Analysing:</span>
                  <span className="text-xs font-semibold text-green-800">{displayCrop}</span>
                </div>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={modelStatus === 'loading'}
                className="w-full py-3 bg-green-600
                           hover:bg-green-700
                           disabled:opacity-50
                           text-white font-bold
                           rounded-xl text-sm
                           transition-all
                           active:scale-95
                           flex items-center
                           justify-center gap-2"
              >
                {modelStatus === 'loading'
                  ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Loading models...
                    </>
                    )
                  : (
                    <>
                      <Scale size={16} />
                      Compress &amp; Analyse
                    </>
                    )}
              </button>
            </div>
          )}

          {/* COMPRESSING */}
          {mode === 'compressing' && (
            <div className="flex flex-col items-center py-10 gap-4">
              <Loader2 size={32} className="animate-spin text-green-600" />
              <p className="text-sm font-medium text-gray-700">⚡ Optimising image...</p>
            </div>
          )}

          {/* ANALYZING */}
          {mode === 'analyzing' && (
            <div className="space-y-4">
              {previewUrl && (
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <img src={previewUrl} alt="Analyzing" className="w-full max-h-48 object-contain opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${((analysisStepIndex + 1) / ANALYSIS_STEPS.length) * 100}%` }}
                      />
                    </div>
                    <p className="text-white text-xs mt-2 font-medium">
                      {ANALYSIS_STEPS[analysisStepIndex]}
                    </p>
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 space-y-2">
                {ANALYSIS_STEPS.slice(0, analysisStepIndex + 1).map((step, i) => (
                  <div key={step} className="flex items-center gap-2 text-sm">
                    <CheckCircle size={14} className="text-green-600 shrink-0" />
                    <span className="text-gray-700">{step}</span>
                  </div>
                ))}
                {analysisStepIndex < ANALYSIS_STEPS.length - 1 && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 size={14} className="animate-spin shrink-0" />
                    <span>{ANALYSIS_STEPS[analysisStepIndex + 1]}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RESULT — Puter vision or fallback */}
          {mode === 'result' && unifiedResult && (
            <div className="space-y-4">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Result"
                  className="w-full max-h-40 object-contain bg-gray-50 rounded-xl"
                />
              )}
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 text-center">
                <p className="text-xs text-green-700 mb-1">
                  {unifiedResult.source === 'puter_gpt4o'
                    ? '⚡ GPT-4o Vision (Free)'
                    : unifiedResult.source === 'puter_gemini'
                      ? '⚡ Gemini 2.5 Vision (Free)'
                      : '📊 Local Model (Fallback)'}
                </p>
                <p className="text-3xl font-black text-green-700">
                  {(unifiedResult.estimatedWeightKg ?? 0).toLocaleString('en-IN')}
                  <span className="text-base font-normal text-green-600 ml-1">kg</span>
                </p>
                <p className="text-sm text-green-600 mt-0.5">
                  ({(unifiedResult.estimatedWeightKg / 1000).toFixed(3)} tons)
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Range: {(unifiedResult.weightRangeMin ?? 0).toLocaleString('en-IN')} – {(unifiedResult.weightRangeMax ?? 0).toLocaleString('en-IN')} kg
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-200/80 text-green-800">
                    🎯 {unifiedResult.confidencePercent}%
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                    📋 {unifiedResult.method}
                  </span>
                  {unifiedResult.qualityGrade && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      ⭐ Grade {unifiedResult.qualityGrade}
                    </span>
                  )}
                </div>
                {unifiedResult.cropTypeDetected && (
                  <p className="text-xs text-gray-600 mt-2">
                    🌾 Crop: {unifiedResult.cropTypeDetected}
                    {unifiedResult.cropTypeConfirmed ? ' ✅' : ''}
                  </p>
                )}
                {unifiedResult.reasoning && (
                  <p className="text-xs text-left text-gray-600 mt-3 px-1 border-t border-green-200 pt-2">
                    📝 {unifiedResult.reasoning}
                  </p>
                )}
                {unifiedResult.warnings && (
                  <p className="text-xs text-amber-700 mt-2">⚠️ {unifiedResult.warnings}</p>
                )}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    type="button"
                    onClick={reset}
                    className="py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50"
                  >
                    🔄 Try Again
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    className="py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl active:scale-95"
                  >
                    ✅ Apply to Form
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* APPLIED */}
          {mode === 'applied' && (
            <div className="flex flex-col items-center py-10 gap-4">
              <CheckCircle size={48} className="text-green-600" />
              <p className="text-sm font-semibold text-gray-800 text-center">
                ✅ {((unifiedResult?.estimatedWeightKg ?? 0) / 1000).toFixed(3)} tons applied to Quantity field
              </p>
            </div>
          )}

          {/* ERROR */}
          {mode === 'error' && (
            <div className="flex flex-col
                            items-center py-8
                            gap-4 text-center"
            >
              <AlertCircle
                size={36}
                className="text-red-500"
              />
              <div className="space-y-1">
                <p className="font-semibold
                              text-gray-800 text-sm"
                >
                  Analysis Failed
                </p>
                <p className="text-xs text-gray-500
                              max-w-xs"
                >
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="px-6 py-2.5 bg-gray-900
                           hover:bg-gray-800
                           text-white text-sm
                           font-medium rounded-xl"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}





