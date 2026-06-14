"use client";

import { useDropzone } from "react-dropzone";
import { ImagePlus, X } from "lucide-react";
import { useState } from "react";

export type UploadFile = { file: File; preview: string };

export function Dropzone({
  value,
  onChange,
  maxFiles = 12,
}: {
  value: UploadFile[];
  onChange: (files: UploadFile[]) => void;
  maxFiles?: number;
}) {
  const [error, setError] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxSize: 8 * 1024 * 1024,
    onDropRejected: (rejects) =>
      setError(rejects[0]?.errors[0]?.message || "File rejected"),
    onDrop: (accepted) => {
      setError(null);
      const next = [
        ...(value ?? []),
        ...accepted.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
        })),
      ].slice(0, maxFiles);
      onChange(next);
    },
  });

  function remove(i: number) {
    const next = [...(value ?? [])];
    URL.revokeObjectURL(next[i].preview);
    next.splice(i, 1);
    onChange(next);
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`surface rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-ember-500 bg-ember-50/40" : ""
        }`}
        style={{ borderStyle: "dashed" }}
      >
        <input {...getInputProps()} />
        <ImagePlus className="mx-auto mb-3 text-ember-500" size={32} />
        <p className="font-display text-lg font-medium">
          {isDragActive ? "Release to upload" : "Drag photos here"}
        </p>
        <p className="text-mute text-sm mt-1">
          or click to browse · JPG / PNG / WebP · 8 MB max · up to {maxFiles} images
        </p>
      </div>

      {error && <p className="mt-2 text-sm text-ember-600">{error}</p>}

      {(value ?? []).length > 0 && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
          {(value ?? []).map((f, i) => (
            <div key={i} className="relative group aspect-square overflow-hidden rounded-lg surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.preview} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove"
              >
                <X size={14} />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] uppercase tracking-wider bg-ember-500 text-white px-1.5 py-0.5 rounded">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
