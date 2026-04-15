import request from 'supertest';
import { createApp } from '../../app.ts';

const app = createApp();

describe('GET /api/getMenu', () => {
  it('JWT 关闭时应返回 200 和菜单数据', async () => {
    const res = await request(app).get('/api/getMenu');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('code', 200);
    expect(res.body).toHaveProperty('data');
  });
});

describe('JWT 中间件（启用状态）', () => {
  beforeAll(() => {
    process.env.JWT_ENABLED = 'true';
  });

  afterAll(() => {
    process.env.JWT_ENABLED = 'false';
  });

  it('无 token 应返回 401', async () => {
    const res = await request(app).get('/api/getMenu');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('code', 401);
  });

  it('token 格式错误应返回 401', async () => {
    const res = await request(app)
      .get('/api/getMenu')
      .set('Authorization', 'InvalidToken');
    expect(res.status).toBe(401);
  });

  it('有效 token 应返回 200', async () => {
    const { generateToken } = await import('../../utils/middleware/jwtMiddleware.ts');
    const token = generateToken({ userId: 1 });
    const res = await request(app)
      .get('/api/getMenu')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
