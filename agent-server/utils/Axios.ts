import { SharedAxiosService } from '@super-pro/shared-server';
import config from '../src/config.ts';
import { Logger } from './index.ts';

class AxiosService extends SharedAxiosService {
  private static instance: AxiosService;

  private constructor() {
    super({
      axiosConfig: config.axios,
      logger: Logger.getInstance(),
    });
  }

  public static getInstance(): AxiosService {
    if (!AxiosService.instance) {
      AxiosService.instance = new AxiosService();
    }

    return AxiosService.instance;
  }
}

export default AxiosService;
