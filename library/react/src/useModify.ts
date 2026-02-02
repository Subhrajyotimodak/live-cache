import React, { useState } from 'react'

export default function useModify<T extends (...args: unknown[]) => Promise<unknown>>(fn: T) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const mutate = React.useCallback(
        async (...args: Parameters<T>) => {
            setLoading(true);
            setError(null);
            try {
                return await fn(...args);
            } catch (error) {
                setError(error);
            } finally {
                setLoading(false);
            }
        },
        [fn]
    );

    return { mutate, loading, error };
}
