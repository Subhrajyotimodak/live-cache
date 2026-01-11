import Controller from "./Controller";
import { ModelType } from "./Document";

/**
 * Join data across multiple controllers by applying cross-controller equality constraints.
 *
 * `where.$and[controllerName]` can include:
 * - literal: `{ id: 1 }`
 * - join ref: `{ userId: { $ref: { controller: "users", field: "id" } } }`
 * - eq: `{ status: { $eq: "active" } }`
 *
 * `select` supports:
 * - array of qualified keys: `["users.id", "posts.title"]`
 * - select-map for aliasing: `{ "users.id": "userId", "posts.title": "title" }`
 * - mixed array: `["users.id", { "posts.title": "title" }]`
 *
 * @example
 * ```ts
 * const rows = join(
 *   [usersController, postsController] as const,
 *   {
 *     $and: {
 *       posts: { userId: { $ref: { controller: "users", field: "id" } } },
 *     },
 *   } as const,
 *   ["users.name", "posts.title"] as const,
 * );
 * ```
 */
type ControllerName<C> = C extends Controller<any, infer N> ? N : never;
type ControllerVar<C> = C extends Controller<infer V, any> ? V : never;

type Tuple2Plus = readonly [
    Controller<any, any>,
    Controller<any, any>,
    ...Controller<any, any>[],
];

type Names<Cs extends readonly Controller<any, any>[]> = ControllerName<Cs[number]>;
type AnyModel<Cs extends readonly Controller<any, any>[]> = ModelType<ControllerVar<Cs[number]>>;

type ControllerOfName<Cs extends readonly Controller<any, any>[], N extends string> = Extract<
    Cs[number],
    Controller<any, N>
>;

type ModelOfName<Cs extends readonly Controller<any, any>[], N extends string> = ModelType<
    ControllerVar<ControllerOfName<Cs, N>>
>;

export type JoinRef<Cs extends readonly Controller<any, any>[]> = {
    [N in Names<Cs>]: {
        controller: N;
        field: keyof ModelOfName<Cs, N>;
    };
}[Names<Cs>];

type JoinEq<Cs extends readonly Controller<any, any>[], N extends Names<Cs>, K extends keyof ModelOfName<Cs, N>> = {
    $eq: ModelOfName<Cs, N>[K] | JoinRef<Cs>;
    $as?: string;
};

type JoinRefCond<Cs extends readonly Controller<any, any>[]> = {
    $ref: JoinRef<Cs>;
    $as?: string;
};

export type FieldCondition<
    Cs extends readonly Controller<any, any>[],
    N extends Names<Cs>,
    K extends keyof ModelOfName<Cs, N>,
> = ModelOfName<Cs, N>[K] | JoinEq<Cs, N, K> | JoinRefCond<Cs>;

type PerControllerWhere<Cs extends readonly Controller<any, any>[], N extends Names<Cs>> = Partial<{
    [K in keyof ModelOfName<Cs, N>]: FieldCondition<Cs, N, K>;
}>;

type AndWhere<Cs extends readonly Controller<any, any>[]> = Partial<{
    [N in Names<Cs>]: PerControllerWhere<Cs, N>;
}>;

export type JoinWhere<Cs extends readonly Controller<any, any>[]> = {
    $and?: AndWhere<Cs>;
};

type ExtractAs<T> = T extends { $as?: infer S } ? (S extends string ? S : never) : never;

// Shallow `$as` extractor from `where.$and[controller][field]` without deep recursion.
type AsInPerControllerWhere<T> = T extends object ? ExtractAs<T[keyof T]> : never;
type AsInAndWhere<T> = T extends object ? AsInPerControllerWhere<T[keyof T]> : never;
type AsInJoinWhere<W> = W extends { $and?: infer A } ? AsInAndWhere<A> : never;

/**
 * `keyof` on a union (`A | B`) returns only the intersection of keys (`keyof A & keyof B`),
 * which breaks IntelliSense for `select`. This helper distributes over the union to get
 * the full set of keys.
 */
type KeysOfUnion<T> = T extends any ? keyof T : never;

type QualifiedModelKey<Cs extends readonly Controller<any, any>[]> = {
    [N in Names<Cs>]: `${N}.${Extract<keyof ModelOfName<Cs, N>, string>}`;
}[Names<Cs>];

type QualifiedAsKey<Cs extends readonly Controller<any, any>[], W> =
    AsInJoinWhere<W> extends infer A
    ? A extends string
    ? `${Names<Cs>}.${A}`
    : never
    : never;

// Select keys are controller-qualified: "<controller>.<field>".
// We also allow selecting `$as`-produced fields (typed loosely).
type SelectKey<Cs extends readonly Controller<any, any>[], W> = QualifiedModelKey<Cs> | QualifiedAsKey<Cs, W>;

type ValueForKey<Cs extends readonly Controller<any, any>[], K extends PropertyKey> =
    K extends `${infer N}.${infer F}`
    ? N extends Names<Cs>
    ? F extends keyof ModelOfName<Cs, N>
    ? ModelOfName<Cs, N>[F]
    : unknown
    : unknown
    : unknown;

type ProjectionFromSelect<
    Cs extends readonly Controller<any, any>[],
    S extends readonly PropertyKey[],
> = {
        [K in S[number]]: ValueForKey<Cs, K>;
    };

type SelectMap<Cs extends readonly Controller<any, any>[], W> = Partial<Record<SelectKey<Cs, W>, string>>;

type ProjectionFromSelectMap<
    Cs extends readonly Controller<any, any>[],
    M extends Partial<Record<PropertyKey, string>>,
> = {
        [K in keyof M as M[K] extends string ? M[K] : never]: ValueForKey<Cs, K>;
    };

type ProjectionFromSelectMapSafe<Cs extends readonly Controller<any, any>[], M> =
    M extends Partial<Record<PropertyKey, string>> ? ProjectionFromSelectMap<Cs, M> : {};

type UnionToIntersection<U> =
    [U] extends [never]
    ? {}
    : (U extends any ? (k: U) => void : never) extends (k: infer I) => void
    ? I
    : {};

type MixedSelect<Cs extends readonly Controller<any, any>[], W> =
    readonly (SelectKey<Cs, W> | SelectMap<Cs, W>)[];

type KeysFromMixedSelect<SA extends readonly unknown[]> = Extract<SA[number], PropertyKey>;
type MapsFromMixedSelect<SA extends readonly unknown[]> = Extract<SA[number], Partial<Record<PropertyKey, string>>>;

type ProjectionFromMixedSelect<
    Cs extends readonly Controller<any, any>[],
    SA extends readonly unknown[],
> =
    ProjectionFromSelect<Cs, readonly KeysFromMixedSelect<SA>[]> &
    ProjectionFromSelectMapSafe<Cs, UnionToIntersection<MapsFromMixedSelect<SA>>>;

function cartesian<T>(arrays: T[][]): T[][] {
    if (arrays.length === 0) return [[]];
    for (const a of arrays) if (a.length === 0) return [];

    let acc: T[][] = [[]];
    for (const items of arrays) {
        const next: T[][] = [];
        for (const prefix of acc) for (const item of items) next.push([...prefix, item]);
        acc = next;
    }
    return acc;
}

function hasEq(value: unknown): value is { $eq: unknown; $as?: string } {
    return typeof value === "object" && value !== null && "$eq" in value;
}

function hasRef(value: unknown): value is { $ref: { controller: string; field: string }; $as?: string } {
    return (
        typeof value === "object" &&
        value !== null &&
        "$ref" in value &&
        typeof (value as any).$ref === "object" &&
        (value as any).$ref !== null &&
        "controller" in (value as any).$ref &&
        "field" in (value as any).$ref
    );
}

function isJoinRefObject(value: unknown): value is { controller: string; field: string } {
    return (
        typeof value === "object" &&
        value !== null &&
        "controller" in (value as any) &&
        "field" in (value as any)
    );
}

function buildPrefilterObject(where: Record<string, unknown>): Record<string, unknown> {
    // Only include conditions that Collection can evaluate locally:
    // - literal values
    // - {$eq: literal}
    // Excludes cross-controller comparisons ($ref, $eq with JoinRef).
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(where)) {
        if (hasRef(v)) continue;
        if (hasEq(v)) {
            const rhs = (v as any).$eq;
            if (isJoinRefObject(rhs)) continue;
            out[k] = rhs;
            continue;
        }
        out[k] = v;
    }
    return out;
}

function getByName(
    comboByName: Record<string, Record<string, unknown>>,
    controller: string,
    field: string | number | symbol,
) {
    return comboByName[controller]?.[field as any];
}

function applyAliasesToModel(
    model: Record<string, unknown>,
    rawWhere: Record<string, unknown>,
    comboByName: Record<string, Record<string, unknown>>,
) {
    for (const [field, cond] of Object.entries(rawWhere)) {
        const as = (cond as any)?.$as as string | undefined;
        if (!as) continue;

        // Prefer the local value; if missing, try resolving from ref/eq(rhs ref).
        let value = model[field];
        if (value === undefined) {
            if (hasRef(cond)) {
                value = getByName(comboByName, cond.$ref.controller, cond.$ref.field);
            } else if (hasEq(cond) && isJoinRefObject((cond as any).$eq)) {
                const rhs = (cond as any).$eq as { controller: string; field: string };
                value = getByName(comboByName, rhs.controller, rhs.field);
            }
        }

        model[as] = value;
    }
}

/**
 * Joins data across controllers.
 *
 * `where.$and[controllerName]` can include:
 * - literal: `{ id: 1 }`
 * - join: `{ userId: { $ref: { controller: \"users\", field: \"id\" }, $as?: \"userId\" } }`
 * - eq: `{ status: { $eq: \"active\", $as?: \"state\" } }`
 *
 * `$as` aliases the value into the output object (legacy).
 * Prefer passing `select` as an object: `{ fieldName: "alias" }`.
 */
export default function join<const Cs extends Tuple2Plus, const W extends JoinWhere<Cs>, const S extends readonly SelectKey<Cs, W>[]>(
    from: Cs,
    where: W,
    select: S,
): Array<ProjectionFromSelect<Cs, S>>;
export default function join<const Cs extends Tuple2Plus, const W extends JoinWhere<Cs>, const SM extends SelectMap<Cs, W>>(
    from: Cs,
    where: W,
    // Intersect with the constraint so object literals get contextual typing
    // (key autocomplete + excess-property checks) while keeping `SM` inference.
    select: SM & SelectMap<Cs, W>,
): Array<ProjectionFromSelectMap<Cs, SM>>;
export default function join<const Cs extends Tuple2Plus, const W extends JoinWhere<Cs>, const SA extends MixedSelect<Cs, W>>(
    from: Cs,
    where: W,
    select: SA,
): Array<ProjectionFromMixedSelect<Cs, SA>>;
export default function join<const Cs extends Tuple2Plus, const W extends JoinWhere<Cs>>(
    from: Cs,
    where: W = {} as W,
    select: readonly (SelectKey<Cs, W> | SelectMap<Cs, W>)[] | SelectMap<Cs, W>,
): Array<Record<string, unknown>> {
    const andWhere = (where.$and ?? {}) as AndWhere<Cs>;
    const controllerNames = from.map((c) => c.name) as unknown as readonly string[];

    const perControllerMatches: Array<Array<Record<string, unknown>>> = from.map((c) => {
        const rawWhere = (andWhere[c.name as keyof AndWhere<Cs>] ?? {}) as Record<string, unknown>;
        const prefilter = buildPrefilterObject(rawWhere);
        return c.collection.find(prefilter as any).map((d) => d.toModel() as Record<string, unknown>);
    });

    const combos = cartesian(perControllerMatches);

    const filtered = combos.filter((models) => {
        const byName: Record<string, Record<string, unknown>> = {};
        for (let i = 0; i < controllerNames.length; i++) byName[controllerNames[i]] = models[i] ?? {};

        for (const c of from) {
            const rawWhere = (andWhere[c.name as keyof AndWhere<Cs>] ?? {}) as Record<string, unknown>;
            const model = byName[c.name] ?? {};

            for (const [field, cond] of Object.entries(rawWhere)) {
                if (hasRef(cond)) {
                    const lhs = model[field];
                    const rhs = getByName(byName, cond.$ref.controller, cond.$ref.field);
                    if (lhs !== rhs) return false;
                    continue;
                }

                if (hasEq(cond)) {
                    const lhs = model[field];
                    const rhs = (cond as any).$eq;
                    if (isJoinRefObject(rhs)) {
                        const rhsVal = getByName(byName, rhs.controller, rhs.field);
                        if (lhs !== rhsVal) return false;
                    } else {
                        if (lhs !== rhs) return false;
                    }
                }
            }
        }

        return true;
    });

    if (!select) {
        return filtered.map((ms) => Object.assign({}, ...ms));
    }

    return filtered.map((ms) => {
        // Rebuild per-controller view to apply $as aliases deterministically.
        const byName: Record<string, Record<string, unknown>> = {};
        for (let i = 0; i < controllerNames.length; i++) byName[controllerNames[i]] = { ...(ms[i] ?? {}) };

        for (const c of from) {
            const rawWhere = (andWhere[c.name as keyof AndWhere<Cs>] ?? {}) as Record<string, unknown>;
            applyAliasesToModel(byName[c.name] ?? {}, rawWhere, byName);
        }

        // Now project.
        const out: Record<string, unknown> = {};

        const getQualified = (qualified: string): unknown => {
            const dot = qualified.indexOf(".");
            if (dot <= 0) return undefined;
            const controller = qualified.slice(0, dot);
            const field = qualified.slice(dot + 1);
            const model = byName[controller] ?? {};
            return (model as any)[field];
        };

        if (Array.isArray(select)) {
            for (const item of select as ReadonlyArray<unknown>) {
                if (typeof item === "string") {
                    out[item] = getQualified(item);
                    continue;
                }
                if (typeof item === "object" && item !== null) {
                    for (const [key, as] of Object.entries(item)) {
                        if (typeof as !== "string" || as.length === 0) continue;
                        out[as] = getQualified(key);
                    }
                }
            }
        } else {
            for (const [key, as] of Object.entries(select)) {
                if (typeof as !== "string" || as.length === 0) continue;
                out[as] = getQualified(key);
            }
        }

        return out;
    });
}

// Type-check-only example (kept unreachable to avoid runtime side effects).
if (false) {
    join(
        [
            new Controller<{ name: string; age: number; city: string }, "users">("users"),
            new Controller<{ name: string; title: string; body: string; creator: string }, "posts">("posts"),
        ],
        {
            $and: {
                users: {
                    name: {
                        $ref: {
                            controller: "posts",
                            field: "creator",
                        },
                    },
                },
            },
        } as const,
        ["posts._id"]
    )[0];
}
