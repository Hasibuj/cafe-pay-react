import { useCallback, useId, useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, RefreshCw, X } from 'lucide-react'
import {
  compressImage,
  formatBytes,
  MAX_UPLOAD_MB,
  validateImageFile,
} from '../utils/imageUtils'

/**
 * Click-to-change image field with live preview + compression feedback.
 */
export default function ImageUploadField({
  label = 'Image',
  hint,
  valueUrl = null,
  preset = 'default',
  disabled = false,
  busy = false,
  busyLabel = 'Working…',
  onFileReady,
  onClearPending,
  compact = false,
  aspect = '1 / 1',
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [pendingPreview, setPendingPreview] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [stats, setStats] = useState(null)
  const [localBusy, setLocalBusy] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const displayUrl = pendingPreview || valueUrl
  const working = busy || localBusy

  const resetPending = useCallback(() => {
    setPendingPreview(null)
    setPendingFile(null)
    setStats(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
    onClearPending?.()
  }, [onClearPending])

  const handleFiles = useCallback(async (fileList) => {
    const file = fileList?.[0]
    if (!file) return
    setError(null)
    setLocalBusy(true)
    try {
      validateImageFile(file)
      const result = await compressImage(file, preset)
      setPendingPreview(result.dataUrl)
      setPendingFile(file)
      setStats({
        originalBytes: result.originalBytes,
        compressedBytes: result.compressedBytes,
        savedPercent: result.savedPercent,
        width: result.width,
        height: result.height,
        quality: result.quality,
        name: file.name,
      })
      // Pass original file — uploadImage will compress again with same preset
      // (cheap second pass on already-selected file; keeps API simple)
      onFileReady?.(file, result)
    } catch (err) {
      setError(err.message || 'Could not process image')
      setPendingPreview(null)
      setPendingFile(null)
      setStats(null)
      onFileReady?.(null, null)
    } finally {
      setLocalBusy(false)
    }
  }, [preset, onFileReady])

  const onInputChange = (e) => {
    handleFiles(e.target.files)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled || working) return
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className={`cp-img-field ${compact ? 'is-compact' : ''}`}>
      {label ? <label className="cp-owner-label" htmlFor={inputId}>{label}</label> : null}

      <div
        className={`cp-img-drop ${dragOver ? 'is-drag' : ''} ${displayUrl ? 'has-image' : ''}`}
        style={{ aspectRatio: aspect }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled && !working) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {displayUrl ? (
          <img src={displayUrl} alt="" className="cp-img-drop-preview" />
        ) : (
          <div className="cp-img-drop-empty">
            <ImagePlus size={compact ? 20 : 26} strokeWidth={1.5} />
            <span>Drop image or click to add</span>
            <span className="cp-img-drop-limit">Max {MAX_UPLOAD_MB}MB · auto-compressed</span>
          </div>
        )}

        <div className="cp-img-drop-overlay">
          <button
            type="button"
            className="cp-img-action"
            disabled={disabled || working}
            onClick={() => inputRef.current?.click()}
          >
            {working ? (
              <Loader2 size={14} className="animate-spin" />
            ) : displayUrl ? (
              <RefreshCw size={14} />
            ) : (
              <Camera size={14} />
            )}
            {working ? busyLabel : displayUrl ? 'Change' : 'Choose'}
          </button>
          {pendingPreview && !working && (
            <button
              type="button"
              className="cp-img-action is-ghost"
              onClick={resetPending}
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/*"
          className="sr-only"
          disabled={disabled || working}
          onChange={onInputChange}
        />
      </div>

      {hint && !stats && !error ? (
        <p className="cp-img-hint">{hint}</p>
      ) : null}

      {stats && (
        <div className="cp-img-stats">
          <span className="cp-img-stats-name" title={stats.name}>{stats.name}</span>
          <span>
            {formatBytes(stats.originalBytes)}
            {stats.savedPercent > 0 ? (
              <>
                {' → '}
                <strong>{formatBytes(stats.compressedBytes)}</strong>
                {` (−${stats.savedPercent}%)`}
              </>
            ) : (
              <> · {formatBytes(stats.compressedBytes)}</>
            )}
          </span>
          <span>
            {stats.width}×{stats.height} · Q{Math.round(stats.quality * 100)}
          </span>
        </div>
      )}

      {pendingFile && !working && (
        <p className="cp-img-ready">Ready to save — compressed locally</p>
      )}

      {error && <p className="cp-img-error">{error}</p>}
    </div>
  )
}
