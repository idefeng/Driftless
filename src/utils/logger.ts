type LogValue = unknown;

function write(level: 'debug' | 'info' | 'warn' | 'error', message: string, value?: LogValue) {
  const prefix = `[Driftless] ${message}`;
  if (value === undefined) {
    console[level](prefix);
    return;
  }

  console[level](prefix, value);
}

export const logger = {
  debug(message: string, value?: LogValue) {
    write('debug', message, value);
  },
  info(message: string, value?: LogValue) {
    write('info', message, value);
  },
  warn(message: string, value?: LogValue) {
    write('warn', message, value);
  },
  error(message: string, value?: LogValue) {
    write('error', message, value);
  },
};

export type AppLogger = typeof logger;
