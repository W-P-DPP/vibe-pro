import type {
  SiteMenuImportSourceDto,
  UploadedSiteMenuFileDto,
} from '../../src/siteMenu/siteMenu.dto.ts';
import {
  buildSiteMenuEntityTree,
  findSiteMenuNode,
  flattenSiteMenuSeedNodes,
  SiteMenuEntity,
} from '../../src/siteMenu/siteMenu.entity.ts';
import type {
  CreateSiteMenuEntityInput,
  SiteMenuRepositoryPort,
  UpdateSiteMenuEntityInput,
} from '../../src/siteMenu/siteMenu.repository.ts';
import { SiteMenuBusinessError, SiteMenuService } from '../../src/siteMenu/siteMenu.service.ts';

function cloneTree(nodes: SiteMenuEntity[]): SiteMenuEntity[] {
  return buildSiteMenuEntityTree(
    nodes.flatMap((node) => {
      const current = Object.assign(new SiteMenuEntity(), node, {
        children: [],
      });

      return [current, ...cloneTree(node.children)];
    }),
  );
}

function createUploadedFile(
  content: string,
  originalname = 'siteMenu.json',
  mimetype = 'application/json',
): UploadedSiteMenuFileDto {
  return {
    originalname,
    mimetype,
    buffer: Buffer.from(content, 'utf8'),
    size: Buffer.byteLength(content, 'utf8'),
  };
}

function createRepositoryMock(records: SiteMenuEntity[]): SiteMenuRepositoryPort {
  return {
    async getTree() {
      return cloneTree(buildSiteMenuEntityTree(records));
    },
    async getNodeById(id: number) {
      const tree = cloneTree(buildSiteMenuEntityTree(records));
      return findSiteMenuNode(tree, id);
    },
    async createNode(input: CreateSiteMenuEntityInput) {
      return Object.assign(new SiteMenuEntity(), {
        id: 99,
        parentId: input.parentId,
        name: input.name,
        path: input.path,
        icon: input.icon,
        isTop: input.parentId == null,
        strict: input.strict,
        hide: input.hide,
        sort: input.sort ?? 0,
        children: [],
      });
    },
    async updateNode(id: number, input: UpdateSiteMenuEntityInput) {
      const current = records.find((record) => record.id === id);
      if (!current) {
        return null;
      }

      return Object.assign(new SiteMenuEntity(), current, input, {
        parentId: Object.prototype.hasOwnProperty.call(input, 'parentId')
          ? (input.parentId ?? null)
          : current.parentId,
        strict: Object.prototype.hasOwnProperty.call(input, 'strict')
          ? input.strict
          : current.strict,
        hide: Object.prototype.hasOwnProperty.call(input, 'hide')
          ? input.hide
          : current.hide,
        children: [],
      });
    },
    async deleteNode(id: number) {
      const tree = cloneTree(buildSiteMenuEntityTree(records));
      return findSiteMenuNode(tree, id);
    },
    async importTreeFromSource(source: SiteMenuImportSourceDto) {
      return cloneTree(buildSiteMenuEntityTree(flattenSiteMenuSeedNodes(source)));
    },
  };
}

describe('siteMenu 实体与导入辅助', () => {
  it('应按 siteMenu.json 语义展开种子节点并保留 strict 与 hide 默认值', () => {
    const entities = flattenSiteMenuSeedNodes([
      {
        id: 1,
        name: '根菜单',
        path: '/root',
        isTop: true,
        icon: '/icons/root.svg',
        children: [
          {
            id: 11,
            name: '子菜单',
            path: '/child',
            icon: '/icons/child.svg',
          },
        ],
      },
      {
        id: 2,
        name: '第二个根菜单',
        path: '/second',
        isTop: false,
        icon: '/icons/second.svg',
        strict: true,
        hide: true,
      },
    ]);

    expect(entities).toHaveLength(3);
    expect(entities[0]).toMatchObject({
      id: 1,
      parentId: null,
      sort: 0,
      isTop: true,
      strict: false,
      hide: false,
    });
    expect(entities[1]).toMatchObject({
      id: 11,
      parentId: 1,
      sort: 0,
      isTop: false,
      strict: false,
      hide: false,
    });
    expect(entities[2]).toMatchObject({
      id: 2,
      parentId: null,
      sort: 1,
      strict: true,
      hide: true,
    });
  });

  it('应将数据库扁平记录组装为带 strict 与 hide 的树结构', () => {
    const tree = buildSiteMenuEntityTree([
      Object.assign(new SiteMenuEntity(), {
        id: 11,
        parentId: 1,
        name: '子菜单',
        path: '/child',
        icon: '/icons/child.svg',
        isTop: false,
        strict: true,
        hide: true,
        sort: 0,
      }),
      Object.assign(new SiteMenuEntity(), {
        id: 1,
        parentId: null,
        name: '根菜单',
        path: '/root',
        icon: '/icons/root.svg',
        isTop: true,
        strict: false,
        hide: false,
        sort: 0,
      }),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({
      id: 1,
      strict: false,
      hide: false,
      children: [
        expect.objectContaining({
          id: 11,
          parentId: 1,
          strict: true,
          hide: true,
        }),
      ],
    });
  });
});

describe('SiteMenuService', () => {
  const records = flattenSiteMenuSeedNodes([
    {
      id: 1,
      name: '根菜单',
      path: '/root',
      isTop: true,
      strict: false,
      hide: false,
      icon: '/icons/root.svg',
      children: [
        {
          id: 11,
          name: '子菜单',
          path: '/child',
          icon: '/icons/child.svg',
          strict: true,
          hide: true,
        },
      ],
    },
  ]);

  it('父级菜单不存在时应返回中文业务错误', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    await expect(
      service.createSiteMenu({
        parentId: 99999,
        name: '非法子菜单',
        path: '/invalid-child',
        icon: '/icons/test.svg',
      }),
    ).rejects.toMatchObject<Partial<SiteMenuBusinessError>>({
      message: '父级菜单不存在',
    });
  });

  it('创建菜单未传 strict 与 hide 时应默认返回 false', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    const created = await service.createSiteMenu({
      parentId: null,
      name: '测试菜单',
      path: '/test-menu',
      icon: '/icons/test.svg',
    });

    expect(created).toEqual(
      expect.objectContaining({
        id: 99,
        strict: false,
        hide: false,
      }),
    );
  });

  it('创建菜单显式传入 strict 与 hide 时应保留该布尔值', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    const created = await service.createSiteMenu({
      parentId: null,
      name: '隐藏严格菜单',
      path: '/strict-hidden-menu',
      icon: '/icons/test.svg',
      strict: true,
      hide: true,
    });

    expect(created).toEqual(
      expect.objectContaining({
        id: 99,
        strict: true,
        hide: true,
      }),
    );
  });

  it('更新不存在的菜单时应返回中文业务错误', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    await expect(
      service.updateSiteMenu(99999, {
        name: '不存在',
      }),
    ).rejects.toMatchObject<Partial<SiteMenuBusinessError>>({
      message: '菜单不存在',
    });
  });

  it('更新 strict 与 hide 时应返回更新后的布尔值', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    const updated = await service.updateSiteMenu(1, {
      strict: true,
      hide: true,
    });

    expect(updated).toEqual(
      expect.objectContaining({
        id: 1,
        strict: true,
        hide: true,
      }),
    );
  });

  it('hide 不是布尔值时应返回中文参数错误', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    await expect(
      service.updateSiteMenu(1, {
        hide: 'yes' as unknown as boolean,
      }),
    ).rejects.toMatchObject<Partial<SiteMenuBusinessError>>({
      message: '菜单 hide 字段必须是布尔值',
    });
  });

  it('strict 不是布尔值时应返回中文参数错误', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    await expect(
      service.updateSiteMenu(1, {
        strict: 'yes' as unknown as boolean,
      }),
    ).rejects.toMatchObject<Partial<SiteMenuBusinessError>>({
      message: '菜单 strict 字段必须是布尔值',
    });
  });

  it('父级菜单不能挂到当前菜单的子节点下', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    await expect(
      service.updateSiteMenu(1, {
        parentId: 11,
      }),
    ).rejects.toMatchObject<Partial<SiteMenuBusinessError>>({
      message: '父级菜单不能是当前菜单的子节点',
    });
  });

  it('查询菜单树时应返回包含 strict 与 hide 的字段结构', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    const menu = await service.getSiteMenu();

    expect(menu).toEqual([
      expect.objectContaining({
        id: 1,
        name: '根菜单',
        strict: false,
        hide: false,
        children: [
          expect.objectContaining({
            id: 11,
            name: '子菜单',
            strict: true,
            hide: true,
          }),
        ],
      }),
    ]);
  });

  it('未上传文件时应返回中文错误', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    await expect(service.importSiteMenuFile(undefined)).rejects.toMatchObject<
      Partial<SiteMenuBusinessError>
    >({
      message: '请上传菜单 JSON 文件',
    });
  });

  it('上传非法 JSON 时应返回中文错误', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    await expect(service.importSiteMenuFile(createUploadedFile('{'))).rejects.toMatchObject<
      Partial<SiteMenuBusinessError>
    >({
      message: '菜单文件不是有效的 JSON 格式',
    });
  });

  it('上传非法 hide 类型时应返回中文错误', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    await expect(
      service.importSiteMenuFile(
        createUploadedFile(
          JSON.stringify([
            {
              id: 100,
              name: '错误菜单',
              path: '/broken',
              icon: '/icons/broken.svg',
              hide: 'yes',
            },
          ]),
        ),
      ),
    ).rejects.toMatchObject<Partial<SiteMenuBusinessError>>({
      message: '菜单文件字段 hide 必须是布尔值',
    });
  });

  it('上传非法 strict 类型时应返回中文错误', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    await expect(
      service.importSiteMenuFile(
        createUploadedFile(
          JSON.stringify([
            {
              id: 100,
              name: '错误菜单',
              path: '/broken',
              icon: '/icons/broken.svg',
              strict: 'yes',
            },
          ]),
        ),
      ),
    ).rejects.toMatchObject<Partial<SiteMenuBusinessError>>({
      message: '菜单文件字段 strict 必须是布尔值',
    });
  });

  it('上传合法菜单文件时应返回带 strict 与 hide 的新菜单树', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    const imported = await service.importSiteMenuFile(
      createUploadedFile(
        JSON.stringify([
          {
            id: 100,
            name: '导入根菜单',
            path: '/import-root',
            icon: '/icons/import-root.svg',
            isTop: true,
            strict: true,
            hide: true,
            children: [
              {
                id: 101,
                name: '导入子菜单',
                path: '/import-child',
                icon: '/icons/import-child.svg',
              },
            ],
          },
        ]),
      ),
    );

    expect(imported).toEqual([
      expect.objectContaining({
        id: 100,
        name: '导入根菜单',
        strict: true,
        hide: true,
        children: [
          expect.objectContaining({
            id: 101,
            name: '导入子菜单',
            strict: false,
            hide: false,
          }),
        ],
      }),
    ]);
  });
});
