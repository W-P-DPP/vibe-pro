import {
  buildSiteMenuEntityTree,
  findSiteMenuNode,
  flattenSiteMenuSeedNodes,
  type SiteMenuEntity,
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
      const current = {
        ...node,
        children: [],
      };

      return [current, ...cloneTree(node.children)];
    }),
  );
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
      return Object.assign(records[0] ? new (records[0].constructor as typeof SiteMenuEntity)() : {}, {
        id: 99,
        parentId: input.parentId,
        name: input.name,
        path: input.path,
        icon: input.icon,
        isTop: input.parentId == null,
        sort: input.sort ?? 0,
        children: [],
      }) as SiteMenuEntity;
    },
    async updateNode(id: number, input: UpdateSiteMenuEntityInput) {
      const current = records.find((record) => record.id === id);
      if (!current) {
        return null;
      }

      return Object.assign({}, current, input, {
        parentId: Object.prototype.hasOwnProperty.call(input, 'parentId')
          ? (input.parentId ?? null)
          : current.parentId,
        children: [],
      }) as SiteMenuEntity;
    },
    async deleteNode(id: number) {
      const tree = cloneTree(buildSiteMenuEntityTree(records));
      return findSiteMenuNode(tree, id);
    },
  };
}

describe('siteMenu 实体与导入辅助', () => {
  it('应按 siteMenu.json 语义展开种子节点并保留父子关系与排序', () => {
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
      },
    ]);

    expect(entities).toHaveLength(3);
    expect(entities[0]).toMatchObject({
      id: 1,
      parentId: null,
      sort: 0,
      isTop: true,
    });
    expect(entities[1]).toMatchObject({
      id: 11,
      parentId: 1,
      sort: 0,
      isTop: false,
    });
    expect(entities[2]).toMatchObject({
      id: 2,
      parentId: null,
      sort: 1,
    });
  });

  it('应将数据库平铺记录组装为树结构', () => {
    const tree = buildSiteMenuEntityTree([
      Object.assign({ children: [] }, {
        id: 11,
        parentId: 1,
        name: '子菜单',
        path: '/child',
        icon: '/icons/child.svg',
        isTop: false,
        sort: 0,
      }),
      Object.assign({ children: [] }, {
        id: 1,
        parentId: null,
        name: '根菜单',
        path: '/root',
        icon: '/icons/root.svg',
        isTop: true,
        sort: 0,
      }),
    ] as SiteMenuEntity[]);

    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({
      id: 1,
      children: [
        expect.objectContaining({
          id: 11,
          parentId: 1,
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

  it('查询菜单树时应返回中文字段结构', async () => {
    const service = new SiteMenuService(createRepositoryMock(records));

    const menu = await service.getSiteMenu();

    expect(menu).toEqual([
      expect.objectContaining({
        id: 1,
        name: '根菜单',
        children: [
          expect.objectContaining({
            id: 11,
            name: '子菜单',
          }),
        ],
      }),
    ]);
  });
});
