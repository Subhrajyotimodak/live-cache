import { Invalidator } from "@live-cache/core";

export interface WebsocketInvalidatorOptions<TVariable> {
    protocols?: string | string[];
    messageParser?: (event: MessageEvent) => TVariable | TVariable[] | void;
    reconnect?: boolean;
    reconnectIntervalMs?: number;
    onOpen?: (event: Event) => void;
    onClose?: (event: CloseEvent) => void;
    onError?: (event: Event) => void;
}

export default class WebsocketInvalidator<TVariable> extends Invalidator<TVariable> {
    private url: string;
    private protocols?: string | string[];
    private socket: WebSocket | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private reconnect: boolean;
    private reconnectIntervalMs: number;
    private messageParser?: (event: MessageEvent) => TVariable | TVariable[] | void;
    private onOpen?: (event: Event) => void;
    private onClose?: (event: CloseEvent) => void;
    private onError?: (event: Event) => void;
    private active: boolean = false;

    constructor(
        url: string,
        options: WebsocketInvalidatorOptions<TVariable> = {},
    ) {
        super();
        this.url = url;
        this.protocols = options.protocols;
        this.messageParser = options.messageParser;
        this.reconnect = options.reconnect ?? true;
        this.reconnectIntervalMs = options.reconnectIntervalMs ?? 1000;
        this.onOpen = options.onOpen;
        this.onClose = options.onClose;
        this.onError = options.onError;
    }

    public registerInvalidation() {
        if (this.socket) return;
        this.active = true;
        this.connect();
    }

    public unregisterInvalidation() {
        this.active = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (!this.socket) return;
        this.socket.close();
        this.socket = null;
    }

    private connect() {
        const socket = new WebSocket(this.url, this.protocols);
        this.socket = socket;

        socket.addEventListener("open", (event) => {
            this.onOpen?.(event);
        });

        socket.addEventListener("message", (event) => {
            if (!this.messageParser) {
                this.invalidator();
                return;
            }

            const parsed = this.messageParser(event);
            if (parsed === undefined) return;

            if (Array.isArray(parsed)) {
                this.invalidator(...parsed);
            } else {
                this.invalidator(parsed);
            }
        });

        socket.addEventListener("error", (event) => {
            this.onError?.(event);
        });

        socket.addEventListener("close", (event) => {
            this.onClose?.(event);
            this.socket = null;
            if (this.reconnect && this.active) {
                this.scheduleReconnect();
            }
        });
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.active && !this.socket) {
                this.connect();
            }
        }, this.reconnectIntervalMs);
    }
}
