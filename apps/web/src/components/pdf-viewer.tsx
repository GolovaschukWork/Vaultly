import { Button, Sheet, SheetContent, SheetHeader, SheetTitle } from '@vaultly/ui';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTranslation } from 'react-i18next';
import { getBlob } from '@/lib/dexie';
import { useUIStore } from '@/stores/ui-store';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

function useElementWidth(margin = 32) {
  const [width, setWidth] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);

  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;

      if (!node) {
        setWidth(0);
        return;
      }

      const updateWidth = () => {
        setWidth(Math.max(0, node.clientWidth - margin));
      };

      updateWidth();
      const observer = new ResizeObserver(updateWidth);
      observer.observe(node);
      observerRef.current = observer;
    },
    [margin],
  );

  return { containerRef, width };
}

export function PDFViewer() {
  const { t } = useTranslation();
  const { previewFile, setPreviewFile } = useUIStore();
  const { containerRef, width } = useElementWidth();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!previewFile) {
      setBlob(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    setPageNumber(1);
    setNumPages(0);

    void getBlob(previewFile.storageKey)
      .then((record) => {
        if (cancelled) return;
        if (!record) {
          setBlob(null);
          setError(true);
          return;
        }
        setBlob(record);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [previewFile]);

  if (!previewFile) return null;

  return (
    <Sheet open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
      <SheetContent side="right" className="flex h-full w-full flex-col p-0 sm:max-w-2xl">
        <SheetHeader className="border-border shrink-0 border-b px-6 py-4">
          <SheetTitle className="truncate pr-8">{previewFile.name}</SheetTitle>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {loading && (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="text-content-muted h-8 w-8 animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-content-secondary flex flex-1 items-center justify-center px-6 text-center">
              {t('errors:previewFailed')}
            </div>
          )}

          {blob && !loading && !error && (
            <>
              <div
                ref={containerRef}
                className="bg-surface-elevated flex flex-1 justify-center overflow-auto p-4"
              >
                <Document
                  file={blob}
                  onLoadSuccess={({ numPages: pages }) => setNumPages(pages)}
                  loading={
                    <div className="flex h-64 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  }
                  error={<p className="text-danger p-4 text-center">{t('errors:previewFailed')}</p>}
                  className="flex justify-center"
                >
                  <Page
                    pageNumber={pageNumber}
                    width={width > 0 ? width : undefined}
                    renderTextLayer
                    renderAnnotationLayer
                    className="shadow-md"
                  />
                </Document>
              </div>

              {numPages > 1 && (
                <div className="border-border flex shrink-0 items-center justify-center gap-4 border-t px-6 py-4">
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
