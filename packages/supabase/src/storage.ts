import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

export interface UploadResponse {
  data: { path: string; fullPath: string } | null
  error: { message: string } | null
}

export interface DownloadResponse {
  data: Blob | null
  error: { message: string } | null
}

export interface FileResponse {
  data: { name: string }[] | null
  error: { message: string } | null
}

export interface PublicUrlResponse {
  data: { publicUrl: string }
}

export interface SignedUrlResponse {
  data: { signedUrl: string } | null
  error: { message: string } | null
}

export class SupabaseStorage {
  constructor(private client: SupabaseClient<Database>) {}

  /**
   * Upload file to storage bucket
   */
  async upload(
    bucket: string,
    path: string,
    file: File | Blob,
    options?: { cacheControl?: string }
  ): Promise<UploadResponse> {
    return this.client.storage.from(bucket).upload(path, file, options) as Promise<UploadResponse>
  }

  /**
   * Download file from storage
   */
  async download(bucket: string, path: string): Promise<DownloadResponse> {
    return this.client.storage.from(bucket).download(path) as Promise<DownloadResponse>
  }

  /**
   * Delete file from storage
   */
  async delete(bucket: string, paths: string[]): Promise<FileResponse> {
    return this.client.storage.from(bucket).remove(paths) as Promise<FileResponse>
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.client.storage.from(bucket).getPublicUrl(path) as PublicUrlResponse
    return data.publicUrl
  }

  /**
   * List files in bucket
   */
  async list(bucket: string, options?: { path?: string; limit?: number }): Promise<FileResponse> {
    return this.client.storage.from(bucket).list(options?.path, {
      limit: options?.limit || 100,
      sortBy: { column: 'name', order: 'asc' }
    }) as Promise<FileResponse>
  }

  /**
   * Move or rename a file
   */
  async move(
    bucket: string,
    fromPath: string,
    toPath: string
  ): Promise<{ data: { message: string } | null; error: { message: string } | null }> {
    return this.client.storage.from(bucket).move(fromPath, toPath) as Promise<any>
  }

  /**
   * Create a signed URL that expires
   */
  async createSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<SignedUrlResponse> {
    return this.client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn) as Promise<SignedUrlResponse>
  }
}
