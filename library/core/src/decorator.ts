/**
 * A function with attached loading and error state (set by @withMutation).
 */
export interface WithMutationState<T extends (...args: unknown[]) => Promise<unknown>> {
    (...args: Parameters<T>): ReturnType<T>;
    loading: boolean;
    error: Error | null;
}

function wrapWithMutation<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T
): WithMutationState<T> {
    const wrapped = async function (this: unknown, ...args: Parameters<T>) {
        (wrapped as WithMutationState<T>).loading = true;
        (wrapped as WithMutationState<T>).error = null;
        try {
            return await fn.apply(this, args);
        } catch (err) {
            (wrapped as WithMutationState<T>).error = err instanceof Error ? err : new Error(String(err));
            throw err;
        } finally {
            (wrapped as WithMutationState<T>).loading = false;
        }
    } as WithMutationState<T>;
    wrapped.loading = false;
    wrapped.error = null;
    return wrapped;
}

/**
 * Method decorator for Controller subclasses. Use on async methods that perform
 * work (e.g. API calls). It attaches to the decorated method:
 * - `<method>.loading`: boolean, true while the method is running
 * - `<method>.error`: Error | null, set to the thrown error on failure, cleared on success
 *
 * Uses the TC39 decorator signature (2 args: value, context) for compatibility with modern TypeScript.
 *
 * @example
 * ```ts
 * class PostsController extends Controller<Post, "posts"> {
 *   @withMutation()
 *   async createPost(input: Partial<Post>): Promise<Post> {
 *     const res = await fetch("/api/posts", { method: "POST", body: JSON.stringify(input) });
 *     const data = await res.json();
 *     this.collection.insertOne(data);
 *     await this.commit();
 *     return data;
 *   }
 * }
 * // usage: controller.createPost.loading, controller.createPost.error
 * ```
 */
export function withMutation(): (
    value: (...args: unknown[]) => Promise<unknown>,
    context: { kind: string; name: string }
) => WithMutationState<(...args: unknown[]) => Promise<unknown>> {
    return function (
        value: (...args: unknown[]) => Promise<unknown>,
        _context: { kind: string; name: string }
    ) {
        return wrapWithMutation(value);
    };
}
