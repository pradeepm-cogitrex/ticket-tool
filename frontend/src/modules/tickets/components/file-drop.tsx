import { ClipboardEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, FileText, ImagePlus, Paperclip, UploadCloud, X } from 'lucide-react';
import { FilePreview } from '@/shared/components/file-preview';
import { saveFile } from '@/shared/services/api.service';
import { cn } from '@/shared/utils/cn.util';
import { fileSize } from '@/shared/utils/format.util';

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface FileDropProps {
  files: File[];
  onChange: (files: File[]) => void;
  onReject?: (message: string) => void;
  compact?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** screenshot-2026-11-05-104233.png */
const screenshotName = (index: number) => {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `screenshot-${stamp}${index ? `-${index + 1}` : ''}.png`;
};

const isImage = (f: File) => f.type.startsWith('image/');

/**
 * Attachments: a paste box for screenshots (click it, press Ctrl+V, repeat for more)
 * and a drop zone / Browse for any other file. Up to 5 files of 10 MB each.
 */
export function FileDrop({ files, onChange, onReject, compact }: FileDropProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const add = (incoming: File[]) => {
    if (!incoming.length) return;
    const tooBig = incoming.filter((f) => f.size > MAX_FILE_BYTES);
    if (tooBig.length) onReject?.(`${tooBig[0].name} is larger than 10 MB`);
    const next = [...files, ...incoming.filter((f) => f.size <= MAX_FILE_BYTES)];
    if (next.length > MAX_FILES) onReject?.(`You can attach up to ${MAX_FILES} files`);
    onChange(next.slice(0, MAX_FILES));
  };

  const remove = (file: File) => onChange(files.filter((f) => f !== file));

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const pasted = Array.from(e.clipboardData.files);
    e.preventDefault();
    if (!pasted.length) {
      onReject?.('Nothing to paste. Take a screenshot with Windows + Shift + S first.');
      return;
    }
    // Windows names every clipboard image "image.png"; give each a unique name
    add(pasted.map((f, i) => (isImage(f) ? new File([f], screenshotName(files.length + i), { type: f.type || 'image/png' }) : f)));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    add(Array.from(e.dataTransfer.files));
  };

  const images = files.filter(isImage);
  const others = files.filter((f) => !isImage(f));
  const full = files.length >= MAX_FILES;

  const pasteBox = (
    <div
      className={cn('paste-box', compact && 'paste-box--compact', images.length > 0 && 'has-items')}
      tabIndex={0}
      role="button"
      aria-label="Paste a screenshot: click here, then press Ctrl+V"
      onPaste={onPaste}
    >
      {images.map((f) => (
        <Thumb key={`${f.name}-${f.size}`} file={f} onRemove={() => remove(f)} />
      ))}
      {!full && (
        <div className="paste-box__hint">
          <ClipboardPaste />
          <span className="paste-box__idle">
            {images.length ? 'Click here and paste another' : 'Click here, then press'} <span className="kbd">Ctrl</span>+<span className="kbd">V</span>
          </span>
          <span className="paste-box__ready">Ready — press Ctrl + V</span>
        </div>
      )}
    </div>
  );

  const hiddenInput = (
    <input
      ref={input}
      type="file"
      multiple
      hidden
      onChange={(e) => {
        add(Array.from(e.target.files ?? []));
        e.target.value = '';
      }}
    />
  );

  const otherList = others.length > 0 && (
    <ul className="file-list">
      {others.map((f) => (
        <li key={`${f.name}-${f.size}`}>
          <FileText />
          <span className="file-list__name">{f.name}</span>
          <span className="file-list__size">{fileSize(f.size)}</span>
          <button type="button" onClick={() => remove(f)} aria-label={`Remove ${f.name}`}>
            <X size={14} />
          </button>
        </li>
      ))}
    </ul>
  );

  if (compact) {
    return (
      <div className="file-drop-wrap file-drop-wrap--compact">
        <div className="file-drop-compact">
          {pasteBox}
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => input.current?.click()}>
            <Paperclip /> Attach file
          </button>
        </div>
        {hiddenInput}
        {otherList}
      </div>
    );
  }

  return (
    <div className="file-drop-wrap">
      <div className="attach-grid">
        <div>
          <div className="attach-label">
            <ImagePlus size={14} /> Screenshots
          </div>
          {pasteBox}
        </div>
        <div>
          <div className="attach-label">
            <Paperclip size={14} /> Files
          </div>
          <div
            className={cn('file-drop', over && 'is-over')}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            onClick={() => input.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
          >
            <UploadCloud />
            <div className="file-drop__text">
              <strong>Drop files or click to browse</strong>
              <span>
                Up to {MAX_FILES} files in total, 10 MB each · {files.length}/{MAX_FILES} used
              </span>
            </div>
          </div>
        </div>
      </div>
      {hiddenInput}
      {otherList}
    </div>
  );
}

/** Pasted screenshot preview; click to view it large, × to remove. */
function Thumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  const [viewing, setViewing] = useState(false);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <figure className="thumb" title={`${file.name} · ${fileSize(file.size)} · click to view`}>
      <img
        src={url}
        alt={file.name}
        onClick={(e) => {
          e.stopPropagation();
          setViewing(true);
        }}
      />
      <FilePreview
        open={viewing}
        name={file.name}
        mimeType={file.type || 'image/png'}
        src={url}
        onClose={() => setViewing(false)}
        onDownload={() => saveFile(url, file.name)}
      />
      <button
        type="button"
        className="thumb__remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${file.name}`}
      >
        <X size={12} />
      </button>
    </figure>
  );
}
