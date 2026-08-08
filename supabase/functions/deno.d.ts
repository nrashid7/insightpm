// Edge functions run on Deno, but the unit tests import them into the Vite/Node
// program, which has no Deno types. Only the surface the functions actually use
// is declared here; Deno itself typechecks these files at deploy time.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
