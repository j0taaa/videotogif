declare module 'esdk-obs-nodejs' {
  interface ObsClientOptions {
    access_key_id?: string;
    secret_access_key?: string;
    security_token?: string;
    server?: string;
    timeout?: number;
    max_retry_count?: number;
    ssl_verify?: boolean;
    region?: string;
    signature?: string;
  }

  interface ObsResponse<T = unknown> {
    CommonMsg: {
      Status: number;
      Code?: string;
      Message?: string;
      RequestId?: string;
    };
    InterfaceResult: T;
  }

  type Callback<T = unknown> = (error: Error | null, result: ObsResponse<T>) => void;

  interface SignedUrlResult {
    SignedUrl: string;
  }

  class ObsClient {
    constructor(options: ObsClientOptions);

    createBucket(params: Record<string, unknown>, callback: Callback): void;
    putObject(params: Record<string, unknown>, callback: Callback): void;
    getObject(params: Record<string, unknown>, callback: Callback): void;
    listObjects(params: Record<string, unknown>, callback: Callback): void;
    deleteObject(params: Record<string, unknown>, callback: Callback): void;
    deleteObjects(params: Record<string, unknown>, callback: Callback): void;
    createSignedUrlSync(params: Record<string, unknown>): SignedUrlResult;
    close(): void;
  }

  export default ObsClient;
}
