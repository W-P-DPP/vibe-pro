import dotenv from 'dotenv';
import path from 'node:path';

export function getRuntimeProfile(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv === 'production' ? 'production' : 'development';
}

export function getProfileEnvFile(profile = getRuntimeProfile()) {
  return `.env.${profile}`;
}

export function loadProfileEnv(options?: { cwd?: string; profile?: string }) {
  const cwd = options?.cwd ?? process.cwd();
  const profile = options?.profile ?? getRuntimeProfile();
  const envFile = getProfileEnvFile(profile);
  const resolvedPath = path.resolve(cwd, envFile);

  dotenv.config({ path: resolvedPath });

  return {
    profile,
    envFile,
    resolvedPath,
  };
}
