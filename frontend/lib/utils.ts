export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "Unknown";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function isRecent(createdAt: string, days: number = 7): boolean {
  const created = new Date(createdAt);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return created >= cutoff;
}

export function getFileTypeLabel(type: string | null): string {
  if (!type) return "Unknown";
  const map: Record<string, string> = {
    pdf: "PDF", png: "Image", jpg: "Image", jpeg: "Image",
    gif: "Image", webp: "Image", mp4: "Video", mp3: "Audio",
    zip: "Archive", doc: "Document", docx: "Document",
    txt: "Text", md: "Text",
  };
  return map[type.toLowerCase()] || type.toUpperCase();
}

export function getFileTypeColor(type: string | null): string {
  if (!type) return "text-neutral-500 border-neutral-700";
  const colors: Record<string, string> = {
    pdf: "text-red-400 border-red-900/50 bg-red-950/30",
    png: "text-green-400 border-green-900/50 bg-green-950/30",
    jpg: "text-green-400 border-green-900/50 bg-green-950/30",
    jpeg: "text-green-400 border-green-900/50 bg-green-950/30",
    gif: "text-purple-400 border-purple-900/50 bg-purple-950/30",
    webp: "text-teal-400 border-teal-900/50 bg-teal-950/30",
    mp4: "text-blue-400 border-blue-900/50 bg-blue-950/30",
    mp3: "text-yellow-400 border-yellow-900/50 bg-yellow-950/30",
    zip: "text-orange-400 border-orange-900/50 bg-orange-950/30",
    doc: "text-indigo-400 border-indigo-900/50 bg-indigo-950/30",
    docx: "text-indigo-400 border-indigo-900/50 bg-indigo-950/30",
    txt: "text-neutral-400 border-neutral-700 bg-neutral-800/50",
    md: "text-neutral-400 border-neutral-700 bg-neutral-800/50",
  };
  return colors[type.toLowerCase()] || "text-neutral-500 border-neutral-700";
}
