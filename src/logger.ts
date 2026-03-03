const reset = "\x1b[0m";
const dim = "\x1b[2m";
const red = "\x1b[31m";
const yellow = "\x1b[33m";
const cyan = "\x1b[36m";

export const logger = {
  info(...args: unknown[]): void {
    const prefix = `${dim}[${cyan}info${reset}${dim}]${reset}`;
    // eslint-disable-next-line no-console
    console.log(prefix, ...args);
  },
  warn(...args: unknown[]): void {
    const prefix = `${dim}[${yellow}warn${reset}${dim}]${reset}`;
    // eslint-disable-next-line no-console
    console.log(prefix, ...args);
  },
  error(...args: unknown[]): void {
    const prefix = `${dim}[${red}error${reset}${dim}]${reset}`;
    // eslint-disable-next-line no-console
    console.error(prefix, ...args);
  },
};
