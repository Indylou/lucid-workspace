import React, { useState, useRef } from 'react'
import { Button } from './button'
import { cn } from '../../lib/utils'
import { Upload, X, FileIcon, FileText, Image as ImageIcon, File } from 'lucide-react'
import { StorageFile } from '../../lib/storage-service'
import { Spinner } from './spinner'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  onClear?: () => void
  accept?: string
  maxSize?: number
  className?: string
  buttonText?: string
  selectedFile?: File | null
  previewUrl?: string | null
  isLoading?: boolean
  error?: string | null
  uploadedFile?: StorageFile | null
}

export function FileUpload({
  onFileSelect,
  onClear,
  accept = 'image/*,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  maxSize = 5 * 1024 * 1024, // 5MB default
  className,
  buttonText = 'Upload File',
  selectedFile,
  previewUrl,
  isLoading = false,
  error,
  uploadedFile
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      validateAndProcessFile(file)
    }
  }

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0])
    }
  }

  const validateAndProcessFile = (file: File) => {
    setLocalError(null)
    
    // Check file size
    if (file.size > maxSize) {
      setLocalError(`File size exceeds the limit of ${formatBytes(maxSize)}`)
      return
    }
    
    // Check file type
    const acceptedTypes = accept.split(',')
    const fileType = file.type
    
    // If accept is not '*', validate the file type
    if (accept !== '*' && !acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        const mainType = type.split('/')[0]
        return fileType.startsWith(`${mainType}/`)
      }
      return type === fileType
    })) {
      setLocalError(`File type not accepted. Accepted types: ${accept}`)
      return
    }
    
    onFileSelect(file)
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleClear = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (onClear) {
      onClear()
    }
  }

  // Function to format bytes to a human-readable format
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  // Function to get icon based on file type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="h-10 w-10 text-muted-foreground" />
    } else if (fileType.startsWith('text/')) {
      return <FileText className="h-10 w-10 text-muted-foreground" />
    } else if (fileType.includes('pdf')) {
      return <FileIcon className="h-10 w-10 text-muted-foreground" />
    } else {
      return <File className="h-10 w-10 text-muted-foreground" />
    }
  }

  // Show preview or selected file info
  const showFilePreview = () => {
    const file = selectedFile || uploadedFile
    
    if (!file) return null
    
    const fileUrl = uploadedFile?.url || previewUrl || (selectedFile && URL.createObjectURL(selectedFile))
    const fileName = uploadedFile?.name || selectedFile?.name || ''
    const fileType = uploadedFile?.type || selectedFile?.type || ''
    const fileSize = uploadedFile?.size || selectedFile?.size || 0
    
    return (
      <div className="mt-4 p-3 border rounded bg-muted/20 flex items-start gap-3 relative">
        {fileUrl && fileType.startsWith('image/') ? (
          <img 
            src={fileUrl} 
            alt={fileName} 
            className="h-20 w-20 object-cover rounded" 
          />
        ) : (
          getFileIcon(fileType)
        )}
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{fileName}</p>
          <p className="text-xs text-muted-foreground">{formatBytes(fileSize)}</p>
          <p className="text-xs text-muted-foreground">{fileType}</p>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 rounded-full absolute top-2 right-2"
          onClick={handleClear}
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Remove</span>
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20",
          (!!selectedFile || !!uploadedFile) && "border-primary/50 bg-primary/5"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
        />
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Spinner className="h-8 w-8 text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Uploading file...</p>
          </div>
        ) : (selectedFile || uploadedFile) ? (
          showFilePreview()
        ) : (
          <div className="space-y-2">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Drag & drop or click to upload
              </p>
              <p className="text-xs text-muted-foreground">
                Max file size: {formatBytes(maxSize)}
              </p>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleButtonClick}
            >
              {buttonText}
            </Button>
          </div>
        )}
      </div>
      
      {(error || localError) && (
        <p className="text-sm text-destructive mt-2">{error || localError}</p>
      )}
    </div>
  )
} 