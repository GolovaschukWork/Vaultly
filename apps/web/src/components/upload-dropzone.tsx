import { Button, cn } from '@vaultly/ui';
import { Upload } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_FILE_SIZE, isPdfFile } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface UploadDropzoneProps {
  onUpload: (files: File[]) => void;
  isUploading?: boolean;
  className?: string;
}

export function UploadDropzone({ onUpload, isUploading, className }: UploadDropzoneProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validFiles: File[] = [];

      for (const file of fileArray) {
        if (!isPdfFile(file)) {
          toast({
            title: t('errors:onlyPdf'),
            description: file.name,
            variant: 'destructive',
          });
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: t('errors:fileTooLarge'),
            description: file.name,
            variant: 'destructive',
          });
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        onUpload(validFiles);
      }
    },
    [onUpload, t],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      validateAndUpload(e.dataTransfer.files);
    },
    [validateAndUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 border-dashed p-6 text-center transition-all duration-200',
        isDragging
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 scale-[1.01] shadow-md'
          : 'border-border hover:border-border-strong',
        className,
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) validateAndUpload(e.target.files);
          e.target.value = '';
        }}
      />

      <Upload
        className={cn(
          'text-content-muted mx-auto mb-3 h-8 w-8 transition-transform duration-200',
          isDragging && 'text-brand-500 scale-110',
        )}
      />
      <p className="text-content-primary mb-1 text-sm font-medium">{t('common:dropFilesHere')}</p>
      <p className="text-content-muted mb-3 text-xs">{t('common:orClickToBrowse')}</p>
      <p className="text-content-muted mb-4 text-xs">{t('common:maxFileSize')}</p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? t('common:loading') : t('common:uploadPdf')}
      </Button>
    </div>
  );
}
