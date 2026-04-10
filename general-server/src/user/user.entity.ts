import { EntitySchema } from 'typeorm';
import { BaseEntity, BaseSchemaColumns } from '../../utils/entities/base.entity.ts';

export class UserEntity extends BaseEntity {
  id!: number
  username!: string
  nickname!: string
  email!: string
  phone!: string
  status!: number
}

export const UserEntitySchema = new EntitySchema<UserEntity>({
  name: 'User',
  target: UserEntity,
  tableName: 'sys_user',
  columns: {
    id: {
      name: 'id',
      type: Number,
      primary: true,
      generated: 'increment',
      comment: '主键',
    },
    username: {
      name: 'username',
      type: String,
      length: 64,
      nullable: false,
      comment: '用户名',
    },
    nickname: {
      name: 'nickname',
      type: String,
      length: 64,
      nullable: false,
      default: '',
      comment: '用户昵称',
    },
    email: {
      name: 'email',
      type: String,
      length: 128,
      nullable: false,
      default: '',
      comment: '用户邮箱',
    },
    phone: {
      name: 'phone',
      type: String,
      length: 32,
      nullable: false,
      default: '',
      comment: '用户手机号',
    },
    status: {
      name: 'status',
      type: Number,
      nullable: false,
      default: 1,
      comment: '用户状态，1启用，0停用',
    },
    ...BaseSchemaColumns,
  },
  indices: [
    {
      name: 'idx_sys_user_status',
      columns: ['status'],
    },
  ],
  uniques: [
    {
      name: 'uk_sys_user_username',
      columns: ['username'],
    },
  ],
});
