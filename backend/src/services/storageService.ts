import type { ImageMetadata } from "../../../shared/types/index.js";

/**
 * Provides in-memory image metadata persistence for demo use.
 */
export class StorageService {
  private readonly images: Map<string, ImageMetadata>;

  /**
   * Creates a storage service backed by a Map instance.
   * @returns A ready-to-use StorageService object.
   */
  public constructor() {
    this.images = new Map<string, ImageMetadata>();
  }

  /**
   * Saves image metadata by ID.
   * @param metadata Metadata record to store.
   * @returns The saved metadata record.
   */
  public save(metadata: ImageMetadata): ImageMetadata {
    this.images.set(metadata.id, metadata);
    return metadata;
  }

  /**
   * Retrieves metadata by image ID.
   * @param id Unique image identifier.
   * @returns Found metadata or undefined when not present.
   */
  public findById(id: string): ImageMetadata | undefined {
    return this.images.get(id);
  }

  /**
   * Lists all stored image metadata records.
   * @returns Array of all metadata values.
   */
  public findAll(): ImageMetadata[] {
    return Array.from(this.images.values());
  }

  /**
   * Deletes metadata by image ID.
   * @param id Unique image identifier.
   * @returns True when metadata existed and was removed.
   */
  public delete(id: string): boolean {
    return this.images.delete(id);
  }

  /**
   * Checks whether metadata exists for an image ID.
   * @param id Unique image identifier.
   * @returns True when a metadata record exists.
   */
  public exists(id: string): boolean {
    return this.images.has(id);
  }
}

/**
 * Singleton storage instance shared across routes.
 */
export const storageService = new StorageService();
