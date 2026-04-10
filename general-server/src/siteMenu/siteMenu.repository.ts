import type { EntityManager, Repository } from 'typeorm';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import { loadSiteMenuSource, saveSiteMenuSource } from '../siteMenu.ts';
import type { SiteMenuImportSourceDto } from './siteMenu.dto.ts';
import {
  buildSiteMenuEntityTree,
  cloneSiteMenuNode,
  findSiteMenuNode,
  flattenSiteMenuEntityTree,
  flattenSiteMenuSeedNodes,
  SiteMenuEntity,
} from './siteMenu.entity.ts';

export interface CreateSiteMenuEntityInput {
  parentId: number | null
  name: string
  path: string
  icon: string
  isTop: boolean
  sort?: number
  remark?: string
}

export interface UpdateSiteMenuEntityInput {
  parentId?: number | null
  name?: string
  path?: string
  icon?: string
  isTop?: boolean
  sort?: number
  remark?: string
}

export interface SiteMenuRepositoryPort {
  getTree(): Promise<SiteMenuEntity[]>
  getNodeById(id: number): Promise<SiteMenuEntity | null>
  createNode(input: CreateSiteMenuEntityInput): Promise<SiteMenuEntity | null>
  updateNode(id: number, input: UpdateSiteMenuEntityInput): Promise<SiteMenuEntity | null>
  deleteNode(id: number): Promise<SiteMenuEntity | null>
  importTreeFromSource(source: SiteMenuImportSourceDto): Promise<SiteMenuEntity[]>
}

function normalizeSort(sort: number | undefined, size: number): number {
  if (sort === undefined) {
    return size;
  }

  if (sort < 0) {
    return 0;
  }

  if (sort > size) {
    return size;
  }

  return sort;
}

function sameParent(left: number | null | undefined, right: number | null | undefined): boolean {
  return (left ?? null) === (right ?? null);
}

function isDescendant(node: SiteMenuEntity, targetId: number): boolean {
  return node.children.some((child) => child.id === targetId || isDescendant(child, targetId));
}

function assignSequentialSort(nodes: SiteMenuEntity[]): SiteMenuEntity[] {
  nodes.forEach((node, index) => {
    node.sort = index;
  });

  return nodes;
}

async function ensureDataSource() {
  const current = getDataSource();
  if (current?.isInitialized) {
    return current;
  }

  return initDataBase();
}

export class SiteMenuRepository implements SiteMenuRepositoryPort {
  private initializationPromise: Promise<void> | null = null;

  async ensureInitialized(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = this.initializeInternal()
        .then(() => {
          this.initializationPromise = null;
        })
        .catch((error) => {
          this.initializationPromise = null;
          throw error;
        });
    }

    return this.initializationPromise;
  }

  private async initializeInternal(): Promise<void> {
    const dataSource = await ensureDataSource();
    const repository = dataSource.getRepository(SiteMenuEntity);
    const count = await repository.count();

    if (count > 0) {
      return;
    }

    const source = await loadSiteMenuSource();
    if (!Array.isArray(source)) {
      throw new Error('siteMenu.json 根节点必须是数组');
    }

    const seedEntities = flattenSiteMenuSeedNodes(source);
    if (seedEntities.length === 0) {
      return;
    }

    await repository.save(seedEntities);
  }

  private async getRepository(manager?: EntityManager): Promise<Repository<SiteMenuEntity>> {
    const dataSource = await ensureDataSource();

    if (!manager) {
      await this.ensureInitialized();
      return dataSource.getRepository(SiteMenuEntity);
    }

    return manager.getRepository(SiteMenuEntity);
  }

  private async getAllRecords(manager?: EntityManager): Promise<SiteMenuEntity[]> {
    const repository = await this.getRepository(manager);
    return repository.find({
      order: {
        sort: 'ASC',
        id: 'ASC',
      },
    });
  }

  async getTree(): Promise<SiteMenuEntity[]> {
    const records = await this.getAllRecords();
    return buildSiteMenuEntityTree(records);
  }

  async getNodeById(id: number): Promise<SiteMenuEntity | null> {
    const tree = await this.getTree();
    const target = findSiteMenuNode(tree, id);
    return target ? cloneSiteMenuNode(target) : null;
  }

  async createNode(input: CreateSiteMenuEntityInput): Promise<SiteMenuEntity | null> {
    const dataSource = await ensureDataSource();
    await this.ensureInitialized();

    return dataSource.transaction(async (manager) => {
      const repository = await this.getRepository(manager);
      const records = await this.getAllRecords(manager);
      const siblings = records
        .filter((record) => sameParent(record.parentId, input.parentId))
        .sort((left, right) => left.sort - right.sort || left.id - right.id);

      const insertSort = normalizeSort(input.sort, siblings.length);
      const shiftedSiblings = assignSequentialSort([
        ...siblings.slice(0, insertSort),
        Object.assign(new SiteMenuEntity(), {
          id: 0,
          parentId: input.parentId,
          name: '',
          path: '',
          icon: '',
          isTop: input.parentId == null,
          sort: insertSort,
        }),
        ...siblings.slice(insertSort),
      ]).filter((node) => node.id !== 0);

      if (shiftedSiblings.length > 0) {
        await repository.save(shiftedSiblings);
      }

      const entity = repository.create({
        parentId: input.parentId,
        name: input.name,
        path: input.path,
        icon: input.icon,
        isTop: input.parentId == null,
        sort: insertSort,
        createBy: 'system',
        updateBy: 'system',
        remark: input.remark,
      });

      const saved = await repository.save(entity);
      return Object.assign(new SiteMenuEntity(), saved, { children: [] });
    });
  }

  async updateNode(id: number, input: UpdateSiteMenuEntityInput): Promise<SiteMenuEntity | null> {
    const dataSource = await ensureDataSource();
    await this.ensureInitialized();

    return dataSource.transaction(async (manager) => {
      const repository = await this.getRepository(manager);
      const records = await this.getAllRecords(manager);
      const current = records.find((record) => record.id === id);

      if (!current) {
        return null;
      }

      const tree = buildSiteMenuEntityTree(records);
      const currentTreeNode = findSiteMenuNode(tree, id);
      if (!currentTreeNode) {
        return null;
      }

      const nextParentId = Object.prototype.hasOwnProperty.call(input, 'parentId')
        ? (input.parentId ?? null)
        : current.parentId;

      if (nextParentId === id) {
        return null;
      }

      if (nextParentId != null && isDescendant(currentTreeNode, nextParentId)) {
        return null;
      }

      current.parentId = nextParentId;
      current.isTop = nextParentId == null;
      current.name = input.name ?? current.name;
      current.path = input.path ?? current.path;
      current.icon = input.icon ?? current.icon;
      current.remark = input.remark ?? current.remark;
      current.updateBy = 'system';

      const recordsToSave: SiteMenuEntity[] = [current];
      if (!sameParent(currentTreeNode.parentId, nextParentId)) {
        const oldSiblings = assignSequentialSort(
          records
            .filter((record) => record.id !== id && sameParent(record.parentId, currentTreeNode.parentId))
            .sort((left, right) => left.sort - right.sort || left.id - right.id),
        );
        const newSiblings = records
          .filter((record) => record.id !== id && sameParent(record.parentId, nextParentId))
          .sort((left, right) => left.sort - right.sort || left.id - right.id);
        const insertSort = normalizeSort(input.sort, newSiblings.length);

        current.sort = insertSort;
        const nextGroup = assignSequentialSort([
          ...newSiblings.slice(0, insertSort),
          current,
          ...newSiblings.slice(insertSort),
        ]);

        recordsToSave.push(...oldSiblings, ...nextGroup);
      } else {
        const siblings = records
          .filter((record) => sameParent(record.parentId, nextParentId))
          .sort((left, right) => left.sort - right.sort || left.id - right.id)
          .filter((record) => record.id !== id);
        const insertSort = normalizeSort(input.sort ?? current.sort, siblings.length);
        const nextGroup = assignSequentialSort([
          ...siblings.slice(0, insertSort),
          current,
          ...siblings.slice(insertSort),
        ]);

        current.sort = insertSort;
        recordsToSave.push(...nextGroup);
      }

      await repository.save(
        recordsToSave.filter(
          (record, index, array) => array.findIndex((item) => item.id === record.id) === index,
        ),
      );

      const refreshedRecords = await this.getAllRecords(manager);
      const refreshedTree = buildSiteMenuEntityTree(refreshedRecords);
      const updated = findSiteMenuNode(refreshedTree, id);
      return updated ? cloneSiteMenuNode(updated) : null;
    });
  }

  async deleteNode(id: number): Promise<SiteMenuEntity | null> {
    const dataSource = await ensureDataSource();
    await this.ensureInitialized();

    return dataSource.transaction(async (manager) => {
      const repository = await this.getRepository(manager);
      const records = await this.getAllRecords(manager);
      const tree = buildSiteMenuEntityTree(records);
      const target = findSiteMenuNode(tree, id);

      if (!target) {
        return null;
      }

      const deletedNodes = flattenSiteMenuEntityTree([target]);
      const deletedIds = deletedNodes.map((node) => node.id);
      const siblings = assignSequentialSort(
        records
          .filter((record) => !deletedIds.includes(record.id) && sameParent(record.parentId, target.parentId))
          .sort((left, right) => left.sort - right.sort || left.id - right.id),
      );

      await repository.delete(deletedIds);
      if (siblings.length > 0) {
        await repository.save(siblings);
      }

      return cloneSiteMenuNode(target);
    });
  }

  async importTreeFromSource(source: SiteMenuImportSourceDto): Promise<SiteMenuEntity[]> {
    const dataSource = await ensureDataSource();

    return dataSource.transaction(async (manager) => {
      const repository = await this.getRepository(manager);
      const seedEntities = flattenSiteMenuSeedNodes(source);

      await manager.query('DELETE FROM sys_site_menu');

      if (seedEntities.length > 0) {
        await repository.save(seedEntities);
      }

      await saveSiteMenuSource(source);

      const refreshedRecords = await this.getAllRecords(manager);
      return buildSiteMenuEntityTree(refreshedRecords);
    });
  }
}

export const siteMenuRepository = new SiteMenuRepository();

export async function initSiteMenuModule(): Promise<void> {
  await siteMenuRepository.ensureInitialized();
}
