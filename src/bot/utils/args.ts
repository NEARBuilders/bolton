export interface ParsedFlags {
  parsedArgs: string[];
  flags: Map<string, string | boolean>;
}

export function parseFlags(args: string[]): ParsedFlags {
  const flags = new Map<string, string | boolean>();
  const parsedArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith("--")) {
        flags.set(key, value);
        i++;
      } else {
        flags.set(key, true);
      }
    } else {
      parsedArgs.push(arg);
    }
  }

  return { parsedArgs, flags };
}
