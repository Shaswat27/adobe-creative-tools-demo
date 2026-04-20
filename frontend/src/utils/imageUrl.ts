/**
 * Builds a URL to fetch a stored image binary from the backend static mount.
 * @param filename Stored filename on the server (basename only).
 * @returns Absolute URL path for use in img src.
 */
export function getImageFileUrl(filename: string): string {
  return `/uploads/${encodeURIComponent(filename)}`;
}
