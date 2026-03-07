import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'

const FILENAME_TO_CROP: Record<string, string> = {
  'paddy husk':        'Paddy Husk',
  'wheat straw':       'Wheat Straw',
  'corn stalks':       'Corn Stalks',
  'sugarcane bagasse': 'Sugarcane Bagasse',
  'coconut shells':    'Coconut Shells',
}

interface CropDetectButtonProps {
  onDetected: (cropType: string) => void
}

export default function CropDetectButton({ onDetected }: CropDetectButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [detected, setDetected] = useState('')

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Strip extension, lowercase, trim
    const nameOnly = file.name
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .trim()

    const matched = FILENAME_TO_CROP[nameOnly]

    if (matched) {
      setDetected(matched)
      setStatus('success')
      onDetected(matched)
    } else {
      setStatus('error')
      setDetected('')
    }

    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-1 mt-1">
      <button
        type="button"
        onClick={() => {
          setStatus('idle')
          inputRef.current?.click()
        }}
        className="
          inline-flex items-center gap-1.5 
          px-3 py-1.5 w-fit
          text-xs font-medium rounded-md
          border border-green-300 bg-green-50 
          text-green-700 hover:bg-green-100 
          hover:border-green-500
          transition-colors duration-150
        "
      >
        <Camera size={13} />
        Detect Crop Type via Camera
      </button>

      {status === 'success' && (
        <p className="text-xs text-green-600 font-medium">
          ✓ Detected: <span className="font-semibold">{detected}</span>
        </p>
      )}

      {status === 'error' && (
        <p className="text-xs text-red-500">
          Could not detect crop type from this image filename.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
