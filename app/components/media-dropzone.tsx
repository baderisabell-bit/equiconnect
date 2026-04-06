"use client";

import React, { useRef, useState } from "react";
import { CloudUpload } from "lucide-react";

type MediaDropzoneProps = {
  title: string;
  description?: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  buttonLabel?: string;
  busyLabel?: string;
  className?: string;
  onFiles: (files: File[]) => void | Promise<void>;
};

export default function MediaDropzone({
  title,
  description,
  accept,
  multiple = false,
  disabled = false,
  buttonLabel = "Dateien auswählen",
  busyLabel = "Verarbeiten...",
  className = "",
  onFiles,
}: MediaDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const openPicker = () => {
    if (disabled || isBusy) return;
    inputRef.current?.click();
  };

  const normalizeFiles = (source: FileList | File[]) => {
    const files = Array.from(source).filter(Boolean);
    return multiple ? files : files.slice(0, 1);
  };

  const processFiles = async (files: FileList | File[]) => {
    const nextFiles = normalizeFiles(files);
    if (nextFiles.length === 0 || disabled || isBusy) return;

    setIsBusy(true);
    try {
      await onFiles(nextFiles);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    await processFiles(event.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPicker();
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      className={`group rounded-2xl border-2 border-dashed px-4 py-4 transition-all cursor-pointer select-none ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-emerald-300"} ${isDragging ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50"} ${className}`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-emerald-700 shadow-sm">
              <CloudUpload size={16} />
            </span>
            <p className="text-sm font-black uppercase tracking-widest text-slate-800">{title}</p>
          </div>
          {description && <p className="text-xs text-slate-500 leading-relaxed">{description}</p>}
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {isBusy ? busyLabel : multiple ? "Drag & Drop oder klicken, um Dateien auszuwählen" : "Drag & Drop oder klicken, um eine Datei auszuwählen"}
          </p>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openPicker();
          }}
          disabled={disabled || isBusy}
          className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-700 disabled:opacity-60"
        >
          {isBusy ? busyLabel : buttonLabel}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled || isBusy}
        onChange={async (event) => {
          const files = event.target.files;
          if (!files || files.length === 0) return;
          await processFiles(files);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}