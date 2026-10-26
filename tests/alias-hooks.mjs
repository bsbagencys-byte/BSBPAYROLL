import { existsSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function resolveFile(base) {
  if (existsSync(base) && extname(base)) return base;
  if (existsSync(`${base}.ts`)) return `${base}.ts`;
  if (existsSync(`${base}.tsx`)) return `${base}.tsx`;
  if (existsSync(`${base}.js`)) return `${base}.js`;
  if (existsSync(join(base, "index.ts"))) return join(base, "index.ts");
  return base;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const target = resolveFile(join(root, specifier.slice(2)));
    return {
      shortCircuit: true,
      url: pathToFileURL(target).href,
    };
  }
  return nextResolve(specifier, context);
}
