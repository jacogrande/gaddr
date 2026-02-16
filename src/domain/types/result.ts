// Discriminated union Result type — functional core foundation

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

// ── Constructors ──

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

// ── Guards ──

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

// ── Combinators (direct) ──

export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}

export function mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> {
  return result.ok ? result : err(fn(result.error));
}

// ── Combinators (curried for pipe) ──

export function mapFn<T, U, E>(
  fn: (value: T) => U,
): (result: Result<T, E>) => Result<U, E> {
  return (result) => map(result, fn);
}

export function flatMapFn<T, U, E>(
  fn: (value: T) => Result<U, E>,
): (result: Result<T, E>) => Result<U, E> {
  return (result) => flatMap(result, fn);
}

export function mapErrorFn<T, E, F>(
  fn: (error: E) => F,
): (result: Result<T, E>) => Result<T, F> {
  return (result) => mapError(result, fn);
}

// ── Pipe ──

type Fn<A, B> = (a: A) => B;

export function pipe<A, B>(a: A, ab: Fn<A, B>): B;
export function pipe<A, B, C>(a: A, ab: Fn<A, B>, bc: Fn<B, C>): C;
export function pipe<A, B, C, D>(
  a: A,
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
): D;
export function pipe<A, B, C, D, E>(
  a: A,
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
  de: Fn<D, E>,
): E;
export function pipe<A, B, C, D, E, F>(
  a: A,
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
  de: Fn<D, E>,
  ef: Fn<E, F>,
): F;
export function pipe<A, B, C, D, E, F, G>(
  a: A,
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
  de: Fn<D, E>,
  ef: Fn<E, F>,
  fg: Fn<F, G>,
): G;
export function pipe(
  value: unknown,
  ...fns: Fn<unknown, unknown>[]
): unknown {
  return fns.reduce((acc, fn) => fn(acc), value);
}
