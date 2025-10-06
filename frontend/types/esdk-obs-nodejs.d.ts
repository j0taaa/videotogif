declare module 'esdk-obs-nodejs' {
  class ObsClient {
    constructor(options: Record<string, unknown>);
    putObject(
      params: Record<string, unknown>,
      callback: (error: Error | null, result?: unknown) => void
    ): void;
    createSignedUrlSync(params: Record<string, unknown>): { SignedUrl: string };
    putFile(bucket: string, key: string, file_path: string): { status: number; errorMessage?: string };
    getObject(bucket: string, key: string, options: Record<string, unknown>): { status: number; errorMessage?: string };
    createSignedUrl(method: string, bucket: string, key: string, expires: number): { signedUrl: string };
    close(): void;
  }

  export default ObsClient;
}
