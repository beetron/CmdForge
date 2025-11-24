export type Command = {
  id?: number
  command: string
  description?: string
  groupName?: string
  created_at?: string
}

export type CreateCommandInput = Omit<Command, 'id' | 'created_at'>
export type UpdateCommandInput = Command & { id: number }
