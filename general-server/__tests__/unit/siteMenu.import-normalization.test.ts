import type {
  SiteMenuImportSourceDto,
  UploadedSiteMenuFileDto,
} from '../../src/siteMenu/siteMenu.dto.ts';
import {
  buildSiteMenuEntityTree,
  flattenSiteMenuSeedNodes,
  normalizeImportedSiteMenuSource,
  SiteMenuEntity,
} from '../../src/siteMenu/siteMenu.entity.ts';
import type { SiteMenuRepositoryPort } from '../../src/siteMenu/siteMenu.repository.ts';
import { SiteMenuService } from '../../src/siteMenu/siteMenu.service.ts';

function createUploadedFile(content: string): UploadedSiteMenuFileDto {
  return {
    originalname: 'siteMenu.json',
    mimetype: 'application/json',
    buffer: Buffer.from(content, 'utf8'),
    size: Buffer.byteLength(content, 'utf8'),
  };
}

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

function createRepositoryMock(
  onImport: (source: SiteMenuImportSourceDto) => void,
): SiteMenuRepositoryPort {
  return {
    async getTree() {
      return [];
    },
    async getNodeById() {
      return null;
    },
    async createNode() {
      return null;
    },
    async updateNode() {
      return null;
    },
    async deleteNode() {
      return null;
    },
    async importTreeFromSource(source: SiteMenuImportSourceDto) {
      onImport(source);
      return cloneTree(buildSiteMenuEntityTree(flattenSiteMenuSeedNodes(source)));
    },
  };
}

describe('siteMenu import normalization', () => {
  it('regenerates sequential ids for uploaded menu trees', () => {
    const normalized = normalizeImportedSiteMenuSource([
      {
        id: 100,
        name: 'root-a',
        path: '/root-a',
        icon: '/icons/root-a.svg',
        strict: true,
        children: [
          {
            id: 100,
            name: 'child-a',
            path: '/child-a',
            icon: '/icons/child-a.svg',
          },
        ],
      },
      {
        id: 'duplicate-id',
        name: 'root-b',
        path: '/root-b',
        icon: '',
        hide: true,
      },
    ]);

    const entities = flattenSiteMenuSeedNodes(normalized);

    expect(entities.map((entity) => entity.id)).toEqual([1, 2, 3]);
    expect(entities[0]).toMatchObject({
      id: 1,
      parentId: null,
      strict: true,
      hide: false,
      isTop: true,
    });
    expect(entities[1]).toMatchObject({
      id: 2,
      parentId: 1,
      strict: false,
      hide: false,
      isTop: false,
    });
    expect(entities[2]).toMatchObject({
      id: 3,
      parentId: null,
      strict: false,
      hide: true,
      isTop: true,
    });
  });

  it('imports duplicate uploaded ids as a normalized menu tree', async () => {
    const uploadedSource = [
      {
        id: 9,
        name: 'root-a',
        path: '/root-a',
        icon: '/icons/root-a.svg',
        strict: true,
        children: [
          {
            id: 9,
            name: 'child-a',
            path: '/child-a',
            icon: '/icons/child-a.svg',
          },
        ],
      },
      {
        id: 9,
        name: 'root-b',
        path: '/root-b',
        icon: '',
        hide: true,
      },
    ];

    let importedSource: SiteMenuImportSourceDto | null = null;
    const service = new SiteMenuService(
      createRepositoryMock((source) => {
        importedSource = source;
      }),
    );

    const imported = await service.importSiteMenuFile(
      createUploadedFile(JSON.stringify(uploadedSource)),
    );

    expect(importedSource).toEqual(normalizeImportedSiteMenuSource(uploadedSource));
    expect(imported).toEqual([
      expect.objectContaining({
        id: 1,
        name: 'root-a',
        strict: true,
        hide: false,
        children: [
          expect.objectContaining({
            id: 2,
            name: 'child-a',
            strict: false,
            hide: false,
          }),
        ],
      }),
      expect.objectContaining({
        id: 3,
        name: 'root-b',
        strict: false,
        hide: true,
        children: [],
      }),
    ]);
  });
});
