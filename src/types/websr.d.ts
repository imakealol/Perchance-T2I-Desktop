export interface Resolution {
    width: number;
    height: number;
}

export interface WebSRParams {
    source?: any;
    canvas?: HTMLCanvasElement;
    weights: any;
    debug?: boolean;
    resolution?: Resolution;
    network_name: string;
    gpu: GPUDevice;
}

declare class WebSR {
    canvas: HTMLCanvasElement;
    constructor(params: WebSRParams);
    static initWebGPU(): Promise<GPUDevice | false>;
    start(): Promise<void>;
    stop(): Promise<void>;
    render(source?: ImageBitmap): Promise<void>;
    destroy(): Promise<void>;
}

declare global {
    interface Window {
        WebSR: typeof WebSR;
    }
    const WebSR: typeof WebSR;
}
