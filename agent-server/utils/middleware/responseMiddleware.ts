import { createResponseMiddleware } from '@super-pro/shared-server';

export const responseMiddleware = createResponseMiddleware({
  successMessage: 'success',
  failMessage: 'fail',
});
