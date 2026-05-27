export async function compressFile(file: File): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> {
  const originalSize = file.size;
  const compressedStream = file.stream().pipeThrough(new CompressionStream("gzip"));
  const compressedResponse = new Response(compressedStream);
  const blob = await compressedResponse.blob();
  return { blob, originalSize, compressedSize: blob.size };
}

export async function decompressBlob(blob: Blob): Promise<Blob> {
  const decompressedStream = blob.stream().pipeThrough(new DecompressionStream("gzip"));
  const response = new Response(decompressedStream);
  return response.blob();
}

export function compressionRatio(original: number, compressed: number): string {
  if (original === 0) return "0%";
  const ratio = ((original - compressed) / original) * 100;
  return `${ratio.toFixed(1)}%`;
}

export function supportsCompressionStream(): boolean {
  return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
}
