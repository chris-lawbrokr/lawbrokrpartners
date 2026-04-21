"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Download,
  FileText,
  Link as LinkIcon,
  FileCode,
  ExternalLink,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
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

export default function AdminAssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const loadData = useCallback(async () => {
    const res = await apiFetch("/api/assets");
    if (res.ok) setAssets((await res.json()) as Asset[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void loadData();
  }, [user, loadData]);

  const filtered =
    categoryFilter === "all"
      ? assets
      : assets.filter((a) => a.category === categoryFilter);

  const handleDelete = async (id: number) => {
    const res = await apiFetch(`/api/assets/${String(id)}`, {
      method: "DELETE",
    });
    if (res.ok) void loadData();
  };

  return (
    <main className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assets</h1>
        <button
          type="button"
          onClick={() => {
            setShowUpload(true);
          }}
          className="flex cursor-pointer items-center gap-1.5 rounded bg-purple-400 px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Upload Asset
        </button>
      </div>

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {ASSET_TABS.map((tab) => {
          const value = tab === "All" ? "all" : tab;
          const active = categoryFilter === value;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setCategoryFilter(value);
              }}
              className={`cursor-pointer border-b-2 px-4 py-2 text-sm font-medium -mb-px transition-colors ${
                active
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-brand-gray-400 hover:text-brand-gray-600"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-200 border-t-purple-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-brand-gray-300">
          No assets yet. Upload one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((a) => (
            <AssetCard
              key={a.id}
              asset={a}
              canDelete
              onDelete={() => {
                void handleDelete(a.id);
              }}
            />
          ))}
        </div>
      )}

      {showUpload ? (
        <UploadModal
          onClose={() => {
            setShowUpload(false);
          }}
          onUploaded={() => {
            setShowUpload(false);
            void loadData();
          }}
        />
      ) : null}
    </main>
  );
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
    let revoked = false;
    let objectUrl: string | null = null;
    void (async () => {
      const res = await apiFetch(`/api/assets/${String(asset.id)}`);
      if (!res.ok) return;
      const blob = await res.blob();
      objectUrl = URL.createObjectURL(blob);
      if (!revoked) setPreviewUrl(objectUrl);
    })();
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
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

function UploadModal({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isFile = category === "Images" || category === "Documents";
  const isLink = category === "Links";
  const isText = category === "Text Content";

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    if (!category) {
      setError("Please select a category.");
      return;
    }
    if (!name.trim()) {
      setError("Please provide a name.");
      return;
    }
    if (isFile && !file) {
      setError("Please select a file.");
      return;
    }
    if (isLink && !linkUrl.trim()) {
      setError("Please enter a URL.");
      return;
    }
    if (isText && !textContent.trim()) {
      setError("Please enter some text.");
      return;
    }

    setSubmitting(true);
    try {
      let res: Response;
      if (isFile && file) {
        const form = new FormData();
        form.append("file", file);
        form.append("title", name.trim());
        form.append("category", category);
        res = await apiFetch("/api/assets", { method: "POST", body: form });
      } else {
        res = await apiFetch("/api/assets", {
          method: "POST",
          body: JSON.stringify({
            title: name.trim(),
            category,
            url: isLink ? linkUrl.trim() : undefined,
            text: isText ? textContent : undefined,
          }),
        });
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(data?.message ?? "Upload failed");
      }
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[450px] rounded-lg bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Upload Asset</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer text-brand-gray-300 hover:text-brand-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="flex flex-col gap-3 px-6 py-5"
        >
          {error ? (
            <div className="rounded bg-red-100 p-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}
          <label className="flex flex-col gap-1 text-sm font-medium">
            Category *
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
              }}
              required
              className="w-full cursor-pointer rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
            >
              <option value="">Select a category</option>
              {ASSET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Name *
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
              }}
              required
              className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
            />
          </label>
          {isFile ? (
            <label className="flex flex-col gap-1 text-sm font-medium">
              File * (max 10MB)
              <input
                ref={inputRef}
                type="file"
                accept={category === "Images" ? "image/*" : undefined}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                }}
                required
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
            </label>
          ) : null}
          {isLink ? (
            <label className="flex flex-col gap-1 text-sm font-medium">
              URL *
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                }}
                placeholder="https://example.com"
                required
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
            </label>
          ) : null}
          {isText ? (
            <label className="flex flex-col gap-1 text-sm font-medium">
              Text Content *
              <textarea
                value={textContent}
                onChange={(e) => {
                  setTextContent(e.target.value);
                }}
                rows={6}
                required
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
            </label>
          ) : null}
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 cursor-pointer rounded bg-purple-400 py-2.5 text-sm font-medium text-white disabled:opacity-70"
            >
              {submitting ? "Uploading..." : "Upload"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded border border-brand-gray-100 bg-transparent px-4 py-2.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
