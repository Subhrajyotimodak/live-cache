export class Invalidator<TVariable> {
    protected invalidator = (...data: TVariable[]): void => {
        throw Error("The invalidator needs to be binded from the controller");
    }

    bind(invalidator: typeof this.invalidator) {
        this.invalidator = invalidator;
    }

    public registerInvalidation() {
        throw Error("Method not implemented");
    }

    public unregisterInvalidation() {
        throw Error("Method not implemented");
    }
}

export class DefaultInvalidator<TVariable> extends Invalidator<TVariable> {
    bind(invalidator: (...data: TVariable[]) => void) {
        super.bind(invalidator);
    }

    public registerInvalidation() {
        // No-op
    }

    public unregisterInvalidation() {
        return () => { };
    }
}
