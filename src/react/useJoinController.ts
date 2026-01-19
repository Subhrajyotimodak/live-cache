import React, { useEffect, useState } from 'react'
import Controller from '../core/Controller';
import join from '../core/join';


type Args = Parameters<typeof join>;
type From = Args[0];
type Where = Args[1];
type Select = Args[2];

type Result = ReturnType<typeof join>;

interface UseJoinControllerProps {
    from: From;
    where: Where;
    select: Select;
}

/**
 * React hook that recomputes a `join()` projection whenever any of the `from` controllers commit.
 *
 * @example
 * ```tsx
 * const rows = useJoinController({
 *   from: [usersController, postsController] as const,
 *   where: { $and: { posts: { userId: { $ref: { controller: "users", field: "id" } } } } } as const,
 *   select: ["users.name", "posts.title"] as const,
 * });
 * ```
 */
export default function useJoinController({ from, where, select }: UseJoinControllerProps) {

    const [data, setData] = useState<Result>([]);


    useEffect(() => {

        const callback = () => {
            setData(join(from, where, select));
        }

        callback();

        const cleanup = from.map((c) => c.subscribe(callback));

        return () => {
            cleanup.forEach((c) => c());
        }

    }, [from, where, select])



    return data;

}
