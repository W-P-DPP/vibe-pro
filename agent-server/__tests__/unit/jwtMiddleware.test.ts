import { generateToken } from '../../utils/middleware/jwtMiddleware.ts';
import jwt from 'jsonwebtoken';

const SECRET = 'test_secret';

describe('generateToken', () => {
  it('应生成有效的 JWT token', () => {
    const payload = { userId: 1, role: 'admin' };
    const token = generateToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('解码后 payload 应与输入一致', () => {
    const payload = { userId: 42, name: 'test' };
    const token = generateToken(payload);
    const decoded = jwt.verify(token, SECRET) as Record<string, unknown>;
    expect(decoded['userId']).toBe(42);
    expect(decoded['name']).toBe('test');
  });

  it('应在指定时间后过期', () => {
    const token = generateToken({ userId: 1 }, 1);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(() => jwt.verify(token, SECRET)).toThrow();
        resolve();
      }, 1100);
    });
  });
});
