declare module 'image-downloader' {

    import { RequestOptions } from 'http';

    type Options = Pick<RequestOptions, 'headers' | 'auth' | 'agent' | 'timeout' | 'maxHeaderSize'> & {
        url: string,
        dest: string,
        extractFilename?: boolean,
    }

    type DownloadResult = {
        filename: string,
    }

    // eslint-disable-next-line no-unused-vars
    function image(options: Options): Promise<DownloadResult>;
}
