import { readFile } from 'fs/promises';
import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../../app.ts';
import { normalizeImportedSiteMenuSource } from '../../src/siteMenu/siteMenu.entity.ts';
import { saveSiteMenuSource, siteMenuFilePath } from '../../src/siteMenu.ts';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';

type SiteMenuRow = {
  id: number
  parent_id: number | null
  name: string
  path: string
  icon: string
  is_top: number
  strict: number | boolean
  hide: number | boolean
  sort: number
  create_by: string | null
  create_time: Date | string | null
  update_by: string | null
  update_time: Date | string | null
  remark: string | null
}

const SITE_MENU_TABLE_NAME = 'sys_site_menu';
const SITE_MENU_TABLE_COLUMNS = [
  'id',
  'parent_id',
  'name',
  'path',
  'icon',
  'is_top',
  'strict',
  'hide',
  'sort',
  'create_by',
  'create_time',
  'update_by',
  'update_time',
  'remark',
].join(', ');

let app: Express;
let originalSiteMenuRows: SiteMenuRow[] = [];
let originalSiteMenuFileContent = '';

async function getSiteMenuRows(): Promise<SiteMenuRow[]> {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('test datasource is not initialized');
  }

  return dataSource.query(
    `SELECT ${SITE_MENU_TABLE_COLUMNS} FROM ${SITE_MENU_TABLE_NAME} ORDER BY id ASC`,
  ) as Promise<SiteMenuRow[]>;
}

async function clearSiteMenuTable(): Promise<void> {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('test datasource is not initialized');
  }

  await dataSource.query(`DELETE FROM ${SITE_MENU_TABLE_NAME}`);
}

async function insertSiteMenuRows(rows: SiteMenuRow[]): Promise<void> {
  const dataSource = getDataSource();
  if (!dataSource?.isInitialized) {
    throw new Error('test datasource is not initialized');
  }

  for (const row of rows) {
    await dataSource.query(
      `
        REPLACE INTO ${SITE_MENU_TABLE_NAME}
          (${SITE_MENU_TABLE_COLUMNS})
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        row.id,
        row.parent_id,
        row.name,
        row.path,
        row.icon,
        row.is_top,
        row.strict,
        row.hide,
        row.sort,
        row.create_by,
        row.create_time,
        row.update_by,
        row.update_time,
        row.remark,
      ],
    );
  }
}

async function restoreOriginalSiteMenuRows(): Promise<void> {
  await clearSiteMenuTable();
  await insertSiteMenuRows(originalSiteMenuRows);
}

beforeAll(async () => {
  await initDataBase();
  app = createApp();
  originalSiteMenuFileContent = await readFile(siteMenuFilePath, 'utf8');
  originalSiteMenuRows = await getSiteMenuRows();
});

beforeEach(async () => {
  await saveSiteMenuSource(JSON.parse(originalSiteMenuFileContent));
  await restoreOriginalSiteMenuRows();
  process.env.JWT_ENABLED = 'false';
});

afterAll(async () => {
  await saveSiteMenuSource(JSON.parse(originalSiteMenuFileContent));
  await restoreOriginalSiteMenuRows();
  process.env.JWT_ENABLED = 'false';
  const dataSource = getDataSource();
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
});

describe('siteMenu upload import reset', () => {
  it('rebuilds the table from uploaded content and saves the normalized source', async () => {
    const uploadedMenu = [
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
    ];
    const normalizedMenu = normalizeImportedSiteMenuSource(uploadedMenu);

    const res = await request(app)
      .post('/api/site-menu/uploadMenuFile')
      .attach('file', Buffer.from(JSON.stringify(uploadedMenu, null, 2), 'utf8'), {
        filename: 'siteMenu.json',
        contentType: 'application/json',
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
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

    const listRes = await request(app).get('/api/site-menu/getMenu');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toEqual(res.body.data);

    const rows = await getSiteMenuRows();
    expect(rows.map((row) => row.id)).toEqual([1, 2, 3]);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          strict: 1,
          hide: 0,
        }),
        expect.objectContaining({
          id: 2,
          strict: 0,
          hide: 0,
        }),
        expect.objectContaining({
          id: 3,
          strict: 0,
          hide: 1,
        }),
      ]),
    );

    const currentSiteMenuFileContent = await readFile(siteMenuFilePath, 'utf8');
    expect(JSON.parse(currentSiteMenuFileContent)).toEqual(normalizedMenu);
  });
});
