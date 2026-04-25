import { constants, publicEncrypt } from 'crypto';
import type {
  CreateUserEntityInput,
  UpdateUserEntityInput,
  UserRepositoryPort,
} from '../../src/user/user.repository.ts';
import { UserRoleEnum } from '../../src/user/user.dto.ts';
import { UserEntity } from '../../src/user/user.entity.ts';
import {
  clearCachedLoginEncryptionKeyPair,
  hashPassword,
  UserBusinessError,
  UserService,
} from '../../src/user/user.service.ts';

const TEST_PASSWORD = '123456';
const DISABLED_USER_PASSWORD = '654321';

function cloneUser(user: UserEntity): UserEntity {
  return Object.assign(new UserEntity(), user);
}

function createRepositoryMock(records: UserEntity[]): UserRepositoryPort {
  return {
    async getUserList() {
      return records.map(cloneUser);
    },
    async getUserById(id: number) {
      const target = records.find((record) => record.id === id);
      return target ? cloneUser(target) : null;
    },
    async getUserByUsername(username: string) {
      const target = records.find((record) => record.username === username);
      return target ? cloneUser(target) : null;
    },
    async getUserAuthByUsername(username: string) {
      const target = records.find((record) => record.username === username);
      return target ? cloneUser(target) : null;
    },
    async createUser(input: CreateUserEntityInput) {
      return Object.assign(new UserEntity(), {
        id: 99,
        username: input.username,
        nickname: input.nickname,
        email: input.email,
        phone: input.phone,
        status: input.status,
        role: input.role,
        passwordHash: input.passwordHash,
        ...(input.remark !== undefined ? { remark: input.remark } : {}),
      });
    },
    async updateUser(id: number, input: UpdateUserEntityInput) {
      const current = records.find((record) => record.id === id);
      if (!current) {
        return null;
      }

      return Object.assign(new UserEntity(), current, input);
    },
    async deleteUser(id: number) {
      const current = records.find((record) => record.id === id);
      return current ? cloneUser(current) : null;
    },
  };
}

function encryptPassword(publicKey: string, password: string): string {
  return publicEncrypt(
    {
      key: publicKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(password, 'utf8'),
  ).toString('base64');
}

describe('UserService', () => {
  const records = [
    Object.assign(new UserEntity(), {
      id: 1,
      username: 'zhangsan',
      nickname: '张三',
      email: 'zhangsan@example.com',
      phone: '13800000001',
      status: 1,
      role: UserRoleEnum.Admin,
      passwordHash: hashPassword(TEST_PASSWORD),
      remark: '初始用户',
    }),
    Object.assign(new UserEntity(), {
      id: 2,
      username: 'lisi',
      nickname: '李四',
      email: 'lisi@example.com',
      phone: '13800000002',
      status: 0,
      role: UserRoleEnum.Guest,
      passwordHash: hashPassword(DISABLED_USER_PASSWORD),
    }),
  ];

  afterEach(() => {
    delete process.env.LOGIN_PASSWORD_PUBLIC_KEY;
    delete process.env.LOGIN_PASSWORD_PRIVATE_KEY;
    delete process.env.NODE_ENV;
    clearCachedLoginEncryptionKeyPair();
  });

  it('新增用户成功时应返回角色字段', async () => {
    const service = new UserService(createRepositoryMock(records));

    const result = await service.createUser({
      username: 'wangwu',
      nickname: '王五',
      email: 'wangwu@example.com',
      phone: '13800000003',
      status: 1,
      role: UserRoleEnum.Admin,
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 99,
        username: 'wangwu',
        nickname: '王五',
        role: UserRoleEnum.Admin,
      }),
    );
  });

  it('未传角色时应默认创建为 guest', async () => {
    const service = new UserService(createRepositoryMock(records));

    const result = await service.createUser({
      username: 'zhaoliu',
      nickname: '赵六',
      email: 'zhaoliu@example.com',
      phone: '13800000004',
      status: 1,
    });

    expect(result).toEqual(
      expect.objectContaining({
        username: 'zhaoliu',
        role: UserRoleEnum.Guest,
      }),
    );
  });

  it('新增重复用户名时应返回中文业务错误', async () => {
    const service = new UserService(createRepositoryMock(records));

    await expect(
      service.createUser({
        username: 'zhangsan',
        nickname: '重复用户',
        email: 'dup@example.com',
        phone: '13800000009',
        status: 1,
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      message: '用户名已存在',
    });
  });

  it('传入非法角色时应返回角色字段错误', async () => {
    const service = new UserService(createRepositoryMock(records));

    await expect(
      service.createUser({
        username: 'guest-user',
        nickname: '访客',
        role: 'invalid-role' as UserRoleEnum,
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      statusCode: 400,
      context: expect.objectContaining({
        field: 'role',
      }),
    });
  });

  it('查询不存在用户时应返回中文业务错误', async () => {
    const service = new UserService(createRepositoryMock(records));

    await expect(service.getUserDetail(99999)).rejects.toMatchObject<Partial<UserBusinessError>>({
      message: '用户不存在',
    });
  });

  it('更新不存在用户时应返回中文业务错误', async () => {
    const service = new UserService(createRepositoryMock(records));

    await expect(
      service.updateUser(99999, {
        nickname: '不存在',
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      message: '用户不存在',
    });
  });

  it('删除不存在用户时应返回中文业务错误', async () => {
    const service = new UserService(createRepositoryMock(records));

    await expect(service.deleteUser(99999)).rejects.toMatchObject<Partial<UserBusinessError>>({
      message: '用户不存在',
    });
  });

  it('更新用户角色时应返回最新角色', async () => {
    const service = new UserService(createRepositoryMock(records));

    const result = await service.updateUser(1, {
      role: UserRoleEnum.Guest,
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 1,
        role: UserRoleEnum.Guest,
      }),
    );
  });

  it('登录成功时应返回带角色的脱敏用户信息', async () => {
    const service = new UserService(createRepositoryMock(records));
    const publicKey = service.getLoginPublicKey().publicKey;

    const result = await service.loginUser({
      username: 'zhangsan',
      passwordCiphertext: encryptPassword(publicKey, TEST_PASSWORD),
    });

    expect(result).toEqual(
      expect.objectContaining({
        token: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: 7200,
      }),
    );
    expect(result).not.toHaveProperty('user');
  });

  it('登录凭证错误时应返回统一中文错误', async () => {
    const service = new UserService(createRepositoryMock(records));
    const publicKey = service.getLoginPublicKey().publicKey;

    await expect(
      service.loginUser({
        username: 'zhangsan',
        passwordCiphertext: encryptPassword(publicKey, 'wrong-password'),
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      message: '用户名或密码错误',
    });
  });

  it('停用用户登录时应返回中文业务错误', async () => {
    const service = new UserService(createRepositoryMock(records));
    const publicKey = service.getLoginPublicKey().publicKey;

    await expect(
      service.loginUser({
        username: 'lisi',
        passwordCiphertext: encryptPassword(publicKey, DISABLED_USER_PASSWORD),
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      message: '用户已停用，无法登录',
    });
  });
  it('falls back to an ephemeral key pair when production keys are placeholders', async () => {
    process.env.NODE_ENV = 'production';
    process.env.LOGIN_PASSWORD_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\\nreplace_with_public_key\\n-----END PUBLIC KEY-----';
    process.env.LOGIN_PASSWORD_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nreplace_with_private_key\\n-----END PRIVATE KEY-----';
    clearCachedLoginEncryptionKeyPair();

    const service = new UserService(createRepositoryMock(records));
    const publicKey = service.getLoginPublicKey().publicKey;
    const result = await service.loginUser({
      username: 'zhangsan',
      passwordCiphertext: encryptPassword(publicKey, TEST_PASSWORD),
    });

    expect(publicKey).toContain('BEGIN PUBLIC KEY');
    expect(result).toEqual(
      expect.objectContaining({
        token: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: 7200,
      }),
    );
  });
});
