const jar = new Map<string, string>();

export async function cookies() {
  return {
    get(name: string) {
      const value = jar.get(name);
      return value === undefined ? undefined : { value };
    },
    set(name: string, value: string) {
      jar.set(name, value);
    },
    delete(name: string) {
      jar.delete(name);
    },
  };
}

export async function headers() {
  return {
    get() {
      return null;
    },
  };
}
