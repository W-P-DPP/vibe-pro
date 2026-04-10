import { request } from '../request'

export type PostPreview = {
  id: number
  title: string
  body: string
  userId: number
}

export function getPostPreviews(limit = 3) {
  return request.get<PostPreview[]>('/posts', {
    params: {
      _limit: limit,
    },
  })
}
