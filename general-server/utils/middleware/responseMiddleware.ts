import { createResponseMiddleware } from '@super-pro/shared-server';

export const responseMiddleware = createResponseMiddleware({
  successMessage: '成功',
  failMessage: '失败',
});
