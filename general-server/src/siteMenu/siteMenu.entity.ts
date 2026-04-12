import { EntitySchema } from 'typeorm';
import { BaseEntity, BaseSchemaColumns } from '../../utils/entities/base.entity.ts';

export interface RawSiteMenuSeedNode {
  id?: unknown
  name?: unknown
  path?: unknown
  isTop?: unknown
  icon?: unknown
  strict?: unknown
  hide?: unknown
  remark?: unknown
  children?: unknown
}

export class SiteMenuEntity extends BaseEntity {
  id!: number
  parentId!: number | null
  name!: string
  path!: string
  icon!: string
  isTop!: boolean
  strict!: boolean
  hide!: boolean
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
    strict: {
      name: 'strict',
      type: Boolean,
      nullable: false,
      default: false,
      comment: '是否启用严格模式',
    },
    hide: {
      name: 'hide',
      type: Boolean,
      nullable: false,
      default: false,
      comment: '鏄惁榛樿闅愯棌鑿滃崟',
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

function normalizeSeedBoolean(
  value: unknown,
  field: string,
  defaultValue: boolean,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'boolean') {
    throw new Error(`菜单种子字段 ${field} 必须是布尔值`);
  }

  return value;
}

function assertImportNode(value: unknown): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('菜单文件节点必须是对象');
  }
}

function assertImportString(value: unknown, field: string, allowEmpty = false): string {
  if (typeof value !== 'string') {
    throw new Error(`菜单文件字段 ${field} 必须是字符串`);
  }

  if (!allowEmpty && !value.trim()) {
    throw new Error(`菜单文件字段 ${field} 必须是非空字符串`);
  }

  return allowEmpty ? value : value.trim();
}

function normalizeImportBoolean(
  value: unknown,
  field: string,
  defaultValue: boolean,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'boolean') {
    throw new Error(`菜单文件字段 ${field} 必须是布尔值`);
  }

  return value;
}

function normalizeImportedSiteMenuNode(
  value: unknown,
  parentId: number | null,
  nextIdRef: { value: number },
): RawSiteMenuSeedNode {
  assertImportNode(value);

  const raw = value as RawSiteMenuSeedNode;
  const id = nextIdRef.value;
  nextIdRef.value += 1;

  const children = raw.children === undefined
    ? []
    : Array.isArray(raw.children)
      ? raw.children
      : (() => {
          throw new Error('菜单文件字段 children 必须是数组');
        })();

  if (raw.isTop !== undefined && typeof raw.isTop !== 'boolean') {
    throw new Error('菜单文件字段 isTop 必须是布尔值');
  }

  return {
    id,
    name: assertImportString(raw.name, 'name'),
    path: assertImportString(raw.path, 'path', true),
    icon: assertImportString(raw.icon, 'icon', true),
    isTop: parentId == null,
    strict: normalizeImportBoolean(raw.strict, 'strict', false),
    hide: normalizeImportBoolean(raw.hide, 'hide', false),
    remark: typeof raw.remark === 'string' ? raw.remark.trim() : '',
    children: children.map((child) => normalizeImportedSiteMenuNode(child, id, nextIdRef)),
  };
}

export function normalizeImportedSiteMenuSource(source: unknown[]): RawSiteMenuSeedNode[] {
  const nextIdRef = { value: 1 };
  return source.map((node) => normalizeImportedSiteMenuNode(node, null, nextIdRef));
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
      isTop: normalizeSeedBoolean(raw.isTop, 'isTop', parentId == null),
      strict: normalizeSeedBoolean(raw.strict, 'strict', false),
      hide: normalizeSeedBoolean(raw.hide, 'hide', false),
      sort: index,
      createBy: 'system',
      updateBy: 'system',
      createTime: new Date(),
      updateTime: new Date(),
      remark: typeof raw.remark === 'string' ? raw.remark.trim() : '',
      children: [],
    } satisfies SiteMenuEntity);

    return [entity, ...flattenSiteMenuSeedNodes(children, id)];
  });
}
