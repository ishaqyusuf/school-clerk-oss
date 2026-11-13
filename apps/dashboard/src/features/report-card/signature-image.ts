const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_WIDTH = 600;
const MAX_HEIGHT = 240;
const ACCEPTED = new Set(["image/png", "image/jpeg", "image/webp"]);

function loadImage(file: File) {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const image = new Image();
		image.onload = () => {
			URL.revokeObjectURL(url);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("This image could not be read."));
		};
		image.src = url;
	});
}

/**
 * Turns a photo or scan of a signature into a small transparent PNG data URL:
 * it shrinks the image, fades the paper background to transparent and trims
 * the empty margin, so the signature sits cleanly on the printed line.
 */
export async function prepareSignatureImage(file: File) {
	if (!ACCEPTED.has(file.type)) {
		throw new Error("Upload a PNG, JPEG or WebP image.");
	}
	if (file.size > MAX_INPUT_BYTES) {
		throw new Error("Use an image smaller than 8 MB.");
	}
	const image = await loadImage(file);
	const ratio = Math.min(1, MAX_WIDTH / image.width, MAX_HEIGHT / image.height);
	const width = Math.max(1, Math.round(image.width * ratio));
	const height = Math.max(1, Math.round(image.height * ratio));
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("This browser cannot process images.");
	context.drawImage(image, 0, 0, width, height);

	const pixels = context.getImageData(0, 0, width, height);
	const data = pixels.data;
	let top = height;
	let left = width;
	let right = -1;
	let bottom = -1;
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const index = (y * width + x) * 4;
			const lightness = (data[index]! + data[index + 1]! + data[index + 2]!) / 3;
			// Paper-white becomes transparent; ink keeps its opacity.
			const alpha =
				lightness >= 230 ? 0 : lightness <= 160 ? 255 : Math.round(((230 - lightness) / 70) * 255);
			data[index + 3] = Math.min(data[index + 3]!, alpha);
			if (data[index + 3]! > 24) {
				if (x < left) left = x;
				if (x > right) right = x;
				if (y < top) top = y;
				if (y > bottom) bottom = y;
			}
		}
	}
	if (right < 0) throw new Error("No signature was found in this image.");
	context.putImageData(pixels, 0, 0);

	const pad = 4;
	const cropX = Math.max(0, left - pad);
	const cropY = Math.max(0, top - pad);
	const cropWidth = Math.min(width, right + pad + 1) - cropX;
	const cropHeight = Math.min(height, bottom + pad + 1) - cropY;
	const output = document.createElement("canvas");
	output.width = cropWidth;
	output.height = cropHeight;
	output
		.getContext("2d")
		?.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
	return output.toDataURL("image/png");
}
