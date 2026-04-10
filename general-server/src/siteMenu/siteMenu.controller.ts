import type { Request, Response } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type {
  CreateSiteMenuRequestDto,
  UpdateSiteMenuRequestDto,
  UploadedSiteMenuFileDto,
} from './siteMenu.dto.ts';
import { SiteMenuBusinessError, siteMenuService } from './siteMenu.service.ts';

const getMenu = async (req: Request, res: Response) => {
  try {
    const menu = await siteMenuService.getSiteMenu();
    res.sendSuccess(menu, '获取菜单成功');
  } catch (error) {
    if (error instanceof SiteMenuBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取菜单失败', HttpStatus.ERROR);
  }
};

const getMenuDetail = async (req: Request, res: Response) => {
  try {
    const menu = await siteMenuService.getSiteMenuDetail(Number(req.params.id));
    res.sendSuccess(menu, '获取菜单详情成功');
  } catch (error) {
    if (error instanceof SiteMenuBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取菜单详情失败', HttpStatus.ERROR);
  }
};

const createMenu = async (req: Request, res: Response) => {
  try {
    const created = await siteMenuService.createSiteMenu(req.body as CreateSiteMenuRequestDto);
    res.sendSuccess(created, '新增菜单成功');
  } catch (error) {
    if (error instanceof SiteMenuBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('新增菜单失败', HttpStatus.ERROR);
  }
};

const updateMenu = async (req: Request, res: Response) => {
  try {
    const updated = await siteMenuService.updateSiteMenu(
      Number(req.params.id),
      req.body as UpdateSiteMenuRequestDto,
    );
    res.sendSuccess(updated, '更新菜单成功');
  } catch (error) {
    if (error instanceof SiteMenuBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('更新菜单失败', HttpStatus.ERROR);
  }
};

const deleteMenu = async (req: Request, res: Response) => {
  try {
    const deleted = await siteMenuService.deleteSiteMenu(Number(req.params.id));
    res.sendSuccess(deleted, '删除菜单成功');
  } catch (error) {
    if (error instanceof SiteMenuBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('删除菜单失败', HttpStatus.ERROR);
  }
};

const uploadMenuFile = async (req: Request, res: Response) => {
  try {
    const uploadedFile: UploadedSiteMenuFileDto | undefined = req.file
      ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          buffer: req.file.buffer,
          size: req.file.size,
        }
      : undefined;
    const imported = await siteMenuService.importSiteMenuFile(uploadedFile);
    res.sendSuccess(imported, '上传菜单文件成功');
  } catch (error) {
    if (error instanceof SiteMenuBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('上传菜单文件失败', HttpStatus.ERROR);
  }
};

export { createMenu, deleteMenu, getMenu, getMenuDetail, updateMenu, uploadMenuFile };
