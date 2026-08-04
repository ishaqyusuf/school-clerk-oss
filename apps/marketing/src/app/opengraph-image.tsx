import { ImageResponse } from "next/og";
import { SocialPreviewImage } from "@/components/marketing/social-preview-image";
import { marketingSocialImage } from "@/lib/social-metadata";

export const alt = marketingSocialImage.alt;
export const contentType = "image/png";
export const size = {
  height: marketingSocialImage.height,
  width: marketingSocialImage.width,
};

export default function Image() {
  return new ImageResponse(<SocialPreviewImage />, size);
}
