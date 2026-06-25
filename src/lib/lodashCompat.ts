type PathPart = string | number;
type PropertyPath = PathPart | PathPart[];

function toPath(path: PropertyPath): PathPart[] {
  if (Array.isArray(path)) return path;
  if (typeof path === "number") return [path];
  return path
    .replace(/\[(\w+)\]/g, ".$1")
    .replace(/^\./, "")
    .split(".")
    .filter(Boolean);
}

export function get(object: unknown, path: PropertyPath, defaultValue?: unknown) {
  const value = toPath(path).reduce<unknown>((current, key) => {
    if (current == null) return undefined;
    return (current as Record<PathPart, unknown>)[key];
  }, object);

  return value === undefined ? defaultValue : value;
}

export function omit<T extends Record<string, unknown>>(object: T | null | undefined, paths: PropertyPath[]) {
  const clone: Record<string, unknown> = { ...(object ?? {}) };

  paths.forEach((path) => {
    const parts = toPath(path);
    if (parts.length === 1) {
      delete clone[String(parts[0])];
      return;
    }

    const parent = parts.slice(0, -1).reduce<unknown>((current, key) => {
      if (current == null) return undefined;
      return (current as Record<PathPart, unknown>)[key];
    }, clone);

    if (parent && typeof parent === "object") {
      delete (parent as Record<PathPart, unknown>)[parts[parts.length - 1]];
    }
  });

  return clone;
}

export default { get, omit };