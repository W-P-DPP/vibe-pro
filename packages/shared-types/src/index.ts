export type ApiEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
};

export type StoredAuthSession = {
  token: string;
  tokenType: 'Bearer';
  expiresAt?: number;
};
