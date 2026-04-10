import { EntitySchema } from 'typeorm';
import { BaseEntity, BaseSchemaColumns } from '../../utils/entities/base.entity.ts';

export interface RawSiteMenuSeedNode {
  id?: unknown
  name?: unknown
  path?: unknown
  isTop?: unknown
  icon?: unknown
  children?: unknown
}

export class SiteMenuEntity extends BaseEntity {
  id!: number
  parentId!: number | null
  name!: string
  path!: string
  icon!: string
  isTop!: boolean
  sort!: number
  children: SiteMenuEntity[] = []
}

export const SiteMenuEntitySchema = new EntitySchema<SiteMenuEntity>({
  name: 'SiteMenu',
  target: SiteMenuEntity,
  tableName: 'sys_site_menu',
  columns: {
    id: {
      name: 'id',
      type: Number,
      primary: true,
      generated: 'increment',
      comment: '主键',
    },
    parentId: {
      name: 'parent_id',
      type: Number,
      nullable: true,
      comment: '父级菜单ID',
    },
    name: {
      name: 'name',
      type: String,
      length: 64,
      nullable: false,
      comment: '菜单名称',
    },
    path: {
      name: 'path',
      type: String,
      length: 512,
      nullable: false,
      default: '',
      comment: '菜单路径',
    },
    icon: {
      name: 'icon',
      type: String,
      length: 255,
      nullable: false,
      default: '',
      comment: '菜单图标',
    },
    isTop: {
      name: 'is_top',
      type: Boolean,
      nullable: false,
      default: false,
      comment: '是否置顶菜单',
    },
    sort: {
      name: 'sort',
      type: Number,
      nullable: false,
      default: 0,
      comment: '同级排序值',
    },
    ...BaseSchemaColumns,
  },
  indices: [
    {
      name: 'idx_site_menu_parent_id',
      columns: ['parentId'],
    },
    {
      name: 'idx_site_menu_sort',
      columns: ['sort'],
    },
  ],
});

function assertSeedNode(value: unknown): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('菜单种子节点必须是对象');
  }
}

function assertNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`菜单种子字段 ${field} 必须是数字`);
  }

  return value;
}

function assertString(value: unknown, field: string, allowEmpty = false): string {
  if (typeof value !== 'string') {
    throw new Error(`菜单种子字段 ${field} 必须是字符串`);
  }

  if (!allowEmpty && !value.trim()) {
    throw new Error(`菜单种子字段 ${field} 必须是非空字符串`);
  }

  return allowEmpty ? value : value.trim();
}

export function cloneSiteMenuNode(node: SiteMenuEntity): SiteMenuEntity {
  const cloned = Object.assign(new SiteMenuEntity(), node);
  cloned.children = node.children.map((child) => cloneSiteMenuNode(child));
  return cloned;
}

export function buildSiteMenuEntityTree(records: readonly SiteMenuEntity[]): SiteMenuEntity[] {
  const nodeMap = new Map<number, SiteMenuEntity>();

  for (const record of records) {
    const node = Object.assign(new SiteMenuEntity(), record);
    node.children = [];
    nodeMap.set(node.id, node);
  }

  const roots: SiteMenuEntity[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId == null) {
      roots.push(node);
      continue;
    }

    const parent = nodeMap.get(node.parentId);
    if (!parent) {
      roots.push(node);
      continue;
    }

    parent.children.push(node);
  }

  const sortNodes = (nodes: SiteMenuEntity[]) => {
    nodes.sort((left, right) => left.sort - right.sort || left.id - right.id);
    for (const current of nodes) {
      sortNodes(current.children);
    }
  };

  sortNodes(roots);
  return roots;
}

export function findSiteMenuNode(
  nodes: readonly SiteMenuEntity[],
  id: number,
): SiteMenuEntity | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const target = findSiteMenuNode(node.children, id);
    if (target) {
      return target;
    }
  }

  return null;
}

export function flattenSiteMenuEntityTree(nodes: readonly SiteMenuEntity[]): SiteMenuEntity[] {
  return nodes.flatMap((node) => [node, ...flattenSiteMenuEntityTree(node.children)]);
}

export function flattenSiteMenuSeedNodes(
  source: unknown[],
  parentId: number | null = null,
): SiteMenuEntity[] {
  return source.flatMap((value, index) => {
    assertSeedNode(value);
    const raw = value as RawSiteMenuSeedNode;
    const id = assertNumber(raw.id, 'id');
    const children = raw.children === undefined
      ? []
      : Array.isArray(raw.children)
        ? raw.children
        : (() => {
            throw new Error('菜单种子字段 children 必须是数组');
          })();

    const entity = Object.assign(new SiteMenuEntity(), {
      id,
      parentId,
      name: assertString(raw.name, 'name'),
      path: assertString(raw.path, 'path', true),
      icon: assertString(raw.icon, 'icon', true),
      isTop: typeof raw.isTop === 'boolean' ? raw.isTop : parentId == null,
      sort: index,
      createBy: 'system',
      updateBy: 'system',
      createTime: new Date(),
      updateTime: new Date(),
      remark: '由 siteMenu.json 初始化导入',
      children: [],
    } satisfies SiteMenuEntity);

    return [entity, ...flattenSiteMenuSeedNodes(children, id)];
  });
}
