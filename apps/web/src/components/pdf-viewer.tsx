import { Button, Sheet, SheetContent, SheetHeader, SheetTitle } from '@vaultly/ui';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTranslation } from 'react-i18next';
import { getBlob } from '@/lib/dexie';
import { useUIStore } from '@/stores/ui-store';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export function PDFViewer() {
  const { t } = useTranslation();
  const { previewFile, setPreviewFile } = useUIStore();
  const [url, setUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!previewFile) {
      setUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    setLoading(true);
    setError(false);
    setPageNumber(1);

    void getBlob(previewFile.storageKey)
      .then((blob) => {
        if (!blob) {
          setError(true);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewFile]);

  if (!previewFile) return null;

  return (
    <Sheet open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="truncate pr-8">{previewFile.name}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          {loading && (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="text-content-muted h-8 w-8 animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-content-secondary flex flex-1 items-center justify-center">
              {t('errors:previewFailed')}
            </div>
          )}

          {url && !loading && !error && (
            <>
              <div className="border-border bg-surface-elevated flex-1 overflow-auto rounded-md border p-2">
                <Document
                  file={url}
                  onLoadSuccess={({ numPages: pages }) => setNumPages(pages)}
                  loading={
                    <div className="flex h-64 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  }
                  error={<p className="text-danger p-4 text-center">{t('errors:previewFailed')}</p>}
                >
                  <Page
                    pageNumber={pageNumber}
                    width={Math.min(window.innerWidth - 80, 600)}
                    renderTextLayer
                    renderAnnotationLayer
                  />
                </Document>
              </div>

              {numPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={pageNumber <= 1}
                    onClick={() => setPageNumber((p) => p - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-content-secondary text-sm">
                    {t('common:page')} {pageNumber} {t('common:of')} {numPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={pageNumber >= numPages}
                    onClick={() => setPageNumber((p) => p + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
