function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function createBlobUploadError(label: string, error: unknown) {
  const message = getErrorMessage(error);

  if (/store(_|\s)?not(_|\s)?found|store does not exist/i.test(message)) {
    return new Error(
      `${label} is not connected to an existing Vercel Blob store. Update BLOB_READ_WRITE_TOKEN to a valid store token.`,
    );
  }

  if (/no token found|blob_read_write_token|token/i.test(message)) {
    return new Error(
      `${label} is not configured. Set BLOB_READ_WRITE_TOKEN before uploading files.`,
    );
  }

  return new Error(`${label} upload failed. ${message}`);
}
