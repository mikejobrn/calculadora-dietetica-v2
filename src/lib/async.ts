export class AsyncTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`${label} excedeu ${Math.round(timeoutMs / 1000)}s sem resposta.`);
    this.name = "AsyncTimeoutError";
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "erro desconhecido";
}

export function withTimeout<T>(
  promise: PromiseLike<T> | Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new AsyncTimeoutError(label, timeoutMs));
    }, timeoutMs);

    Promise.resolve(promise)
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}