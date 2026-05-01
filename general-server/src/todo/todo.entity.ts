import { EntitySchema } from 'typeorm';
import { BaseEntity, BaseSchemaColumns } from '../../utils/entities/base.entity.ts';

export class TodoEntity extends BaseEntity {
  id!: number
  title!: string
  description!: string
  completed!: number
}

export const TodoEntitySchema = new EntitySchema<TodoEntity>({
  name: 'Todo',
  target: TodoEntity,
  tableName: 'todo',
  columns: {
    id: {
      name: 'id',
      type: Number,
      primary: true,
      generated: 'increment',
      comment: '主键',
    },
    title: {
      name: 'title',
      type: String,
      length: 255,
      nullable: false,
      comment: '标题',
    },
    description: {
      name: 'description',
      type: 'text',
      nullable: true,
      comment: '描述',
    },
    completed: {
      name: 'completed',
      type: Boolean,
      nullable: false,
      default: false,
      comment: '是否完成，0 未完成，1 已完成',
    },
    ...BaseSchemaColumns,
  },
  indices: [
    {
      name: 'idx_todo_create_by',
      columns: ['createBy'],
    },
  ],
});
