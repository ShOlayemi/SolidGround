declare module "bun:test" {
  export function mock(): void;
  export namespace mock {
    function module(specifier: string, factory: () => unknown): void;
  }
}
