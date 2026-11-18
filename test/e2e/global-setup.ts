import { execFileSync } from 'node:child_process';

const compose = (...args: string[]) =>
  execFileSync('docker', ['compose', ...args], { stdio: 'inherit' });

export function setup() {
  if (process.env.SERVICE_URL) return;
  compose('up', '-d', '--build', '--wait', 'app');
  return () => compose('down', '--volumes');
}
