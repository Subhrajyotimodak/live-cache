import { Invalidator } from "@live-cache/core";

interface TimeoutInvalidatorOptions {
    immediate?: boolean;
}

export default class TimeoutInvalidator<TVariable> extends Invalidator<TVariable> {
    private timeoutMs: number;
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private immediate: boolean;

    constructor(
        timeoutMs: number = 0,
        options: TimeoutInvalidatorOptions = {},
    ) {
        super();
        this.timeoutMs = timeoutMs;
        this.immediate = options.immediate ?? true;
    }

    public registerInvalidation() {
        if (this.intervalId) return;

        if (this.immediate) {
            this.invalidator();
        }

        if (this.timeoutMs > 0) {
            this.intervalId = setInterval(() => {
                this.invalidator();
            }, this.timeoutMs);
        }
    }

    public unregisterInvalidation() {
        if (!this.intervalId) return;
        clearInterval(this.intervalId);
        this.intervalId = null;
    }
}
