"use client";

import { useEffect, useState } from "react";
import {
  Trash2,
  Download,
  FileText,
  Link as LinkIcon,
  FileCode,
  ExternalLink,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export interface Asset {
  id: number;
  title: string;
  category: string;
  mime_type: string;
  file_name: string;
  file_size: number;
  content: string;
  created_at: string;
}

export const ASSET_CATEGORIES = [
  "Images",
  "Documents",
  "Links",
  "Text Content",
] as const;

export const ASSET_TABS = ["All", ...ASSET_CATEGORIES] as const;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AssetCard({
  asset,
  canDelete,
  onDelete,
}: {
  asset: Asset;
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);
  const [copied, setCopied] = useState(false);
  const isImage = asset.category === "Images";
  const isDocument = asset.category === "Documents";
  const isLink = asset.category === "Links";
  const isText = asset.category === "Text Content";

  useEffect(() => {
    if (!isImage) return;
    const state: { revoked: boolean; objectUrl: string | null } = {
      revoked: false,
      objectUrl: null,
    };
    void (async () => {
      const res = await apiFetch(`/api/assets/${String(asset.id)}`);
      if (!res.ok) return;
      const blob = await res.blob();
      state.objectUrl = URL.createObjectURL(blob);
      if (!state.revoked) setPreviewUrl(state.objectUrl);
    })();
    return () => {
      state.revoked = true;
      if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    };
  }, [asset.id, isImage]);

  const handleDownload = async () => {
    const res = await apiFetch(
      `/api/assets/${String(asset.id)}?download=1`,
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = asset.file_name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(asset.content);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex h-40 items-center justify-center overflow-hidden bg-brand-gray-50">
        {isImage && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={asset.title}
            className="h-full w-full object-cover"
          />
        ) : isImage ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-200 border-t-purple-500" />
        ) : isLink ? (
          <LinkIcon className="h-12 w-12 text-brand-gray-300" />
        ) : isText ? (
          <FileCode className="h-12 w-12 text-brand-gray-300" />
        ) : (
          <FileText className="h-12 w-12 text-brand-gray-300" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {asset.category ? (
          <span className="text-xs font-medium text-purple-500">
            {asset.category}
          </span>
        ) : null}
        <p className="truncate text-sm font-semibold text-brand-gray-600">
          {asset.title}
        </p>
        {isImage || isDocument ? (
          <p className="truncate text-xs text-brand-gray-300">
            {asset.file_name} &middot; {formatSize(asset.file_size)}
          </p>
        ) : isLink ? (
          <p className="truncate text-xs text-brand-gray-300">
            {asset.content}
          </p>
        ) : isText ? (
          <p className="line-clamp-2 text-xs text-brand-gray-300">
            {asset.content}
          </p>
        ) : null}
        <div className="mt-2 flex items-center gap-2">
          {isImage || isDocument ? (
            <button
              type="button"
              onClick={() => {
                void handleDownload();
              }}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded border border-brand-gray-100 bg-brand-gray-50 py-1.5 text-xs font-medium hover:bg-brand-gray-100"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          ) : isLink ? (
            <a
              href={asset.content}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded border border-brand-gray-100 bg-brand-gray-50 py-1.5 text-xs font-medium hover:bg-brand-gray-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Link
            </a>
          ) : isText ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowText(true);
                }}
                className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded border border-brand-gray-100 bg-brand-gray-50 py-1.5 text-xs font-medium hover:bg-brand-gray-100"
              >
                View
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleCopyText();
                }}
                className="cursor-pointer rounded border border-brand-gray-100 bg-transparent px-2 py-1.5 text-xs font-medium text-brand-gray-500 hover:bg-brand-gray-50"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </>
          ) : null}
          {canDelete ? (
            confirm ? (
              <button
                type="button"
                onClick={onDelete}
                className="cursor-pointer rounded bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Confirm
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setConfirm(true);
                }}
                aria-label="Delete asset"
                className="cursor-pointer rounded border border-brand-gray-100 bg-transparent p-1.5 text-brand-gray-400 hover:bg-brand-gray-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )
          ) : null}
        </div>
      </div>
      {showText ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowText(false);
          }}
        >
          <div className="w-full max-w-[500px] rounded-lg bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold">{asset.title}</h2>
              <button
                type="button"
                onClick={() => {
                  setShowText(false);
                }}
                aria-label="Close"
                className="cursor-pointer text-brand-gray-300 hover:text-brand-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap px-6 py-5 text-sm text-brand-gray-600">
              {asset.content}
            </div>
            <div className="flex justify-end border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  void handleCopyText();
                }}
                className="cursor-pointer rounded bg-purple-400 px-4 py-2 text-sm font-medium text-white"
              >
                {copied ? "Copied!" : "Copy Text"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
