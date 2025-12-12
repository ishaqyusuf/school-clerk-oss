interface ImageLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

const CDN_URL = process.env.NEXT_PUBLIC_URL; // "https://schoolclerk.com";

export default function imageLoader({
  src,
  width,
  quality = 80,
}: ImageLoaderParams): string {
  if (src.startsWith("/_next")) {
    return `${CDN_URL}/cdn-cgi/image/width=${width},quality=${quality}/https://app.schoolclerk.com${src}`;
  }
  return `${CDN_URL}/${src}`;
  // return `${CDN_URL}/cdn-cgi/image/width=${width},quality=${quality}/${src}`;
}
