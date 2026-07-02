import { Button, Input, cn } from '@vaultly/ui';
import { FileText, Folder, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { trpc } from '@/lib/trpc';
import { useUIStore } from '@/stores/ui-store';

type SearchResult = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  folderId: string | null;
  parentId: string | null;
  storageKey?: string;
};

interface SearchBarProps {
  roomId: string;
  className?: string;
}

export function SearchBar({ roomId, className }: SearchBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setPreviewFile = useUIStore((state) => state.setPreviewFile);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [], isFetching } = trpc.search.query.useQuery(
    { dataRoomId: roomId, q: debouncedQuery },
    { enabled: debouncedQuery.length > 0 },
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery('');

    if (result.type === 'folder') {
      void navigate({
        to: '/rooms/$roomId/f/$folderId',
        params: { roomId, folderId: result.id },
      });
      return;
    }

    const parentFolderId = result.folderId ?? result.parentId;
    if (parentFolderId) {
      void navigate({
        to: '/rooms/$roomId/f/$folderId',
        params: { roomId, folderId: parentFolderId },
      });
    } else {
      void navigate({ to: '/rooms/$roomId', params: { roomId } });
    }

    if (result.storageKey) {
      setPreviewFile({
        id: result.id,
        name: result.name,
        storageKey: result.storageKey,
      });
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="text-content-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t('common:search')}
          className="pr-9 pl-9"
          maxLength={255}
          aria-label={t('common:search')}
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
            onClick={() => {
              setQuery('');
              setOpen(false);
            }}
            aria-label={t('actions:close')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {open && debouncedQuery && (
        <div className="border-border bg-surface absolute top-full z-50 mt-1 w-full rounded-md border shadow-lg">
          {isFetching ? (
            <p className="text-content-muted px-4 py-3 text-sm">{t('common:loading')}</p>
          ) : results.length === 0 ? (
            <p className="text-content-muted px-4 py-3 text-sm">{t('common:noResults')}</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {results.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    type="button"
                    className="hover:bg-surface-elevated flex w-full items-center gap-3 px-4 py-2 text-sm"
                    onClick={() => handleSelect(result)}
                  >
                    {result.type === 'folder' ? (
                      <Folder className="text-brand-500 h-4 w-4" />
                    ) : (
                      <FileText className="text-danger h-4 w-4" />
                    )}
                    <span className="truncate">{result.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
