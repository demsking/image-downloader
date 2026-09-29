declare module 'image-downloader' {
  import { IncomingHttpHeaders, OutgoingHttpHeaders, RequestOptions } from 'http';

  type Options = Pick<RequestOptions, 'headers' | 'auth' | 'agent' | 'maxHeaderSize'> & {

    /**
     * The image URL to download. Only the `http:` and `https:` protocols are
     * supported.
     */
    url: string;

    /**
     * The image destination. Can be a directory or a filename.
     * If a directory is given, ID will automatically extract the image filename
     * from `options.url`
     */
    dest: string;

    /**
     * Boolean indicating whether the image filename will be automatically extracted
     * from `options.url` or not. Set to `false` to have `options.dest` without a
     * file extension for example.
     * @default true
     */
    extractFilename?: boolean;

    /**
     * The maximum number of allowed redirects; if exceeded, an error will be emitted.
     * @default 21
     */
    maxRedirects?: number;

    /**
     * Socket inactivity timeout in milliseconds. `timeout` is a deadline for
     * silence on the connection, not for the whole download.
     * @default 60000
     */
    timeout?: number;

    /**
     * Maximum number of bytes accepted for the download. A larger response is
     * rejected with an `ERR_RESPONSE_TOO_LARGE` error. Set to `0` to disable
     * the limit.
     * @default 104857600
     */
    maxContentLength?: number;

    /**
     * Called before each redirect is followed, with the request options that
     * will be used for the redirected request. Throw to cancel the download.
     * Authentication headers are dropped after this hook returns when the
     * redirect leaves the origin of `options.url`.
     */
    beforeRedirect?: (
      options: RequestOptions,
      response: { headers: IncomingHttpHeaders; statusCode?: number },
      request: { url: string; method: string; headers?: OutgoingHttpHeaders },
    ) => void;
  }

  type DownloadResult = {
    /**
     * The downloaded filename
     */
    filename: string,
  };

  function image(options: Options): Promise<DownloadResult>;
}
