import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import { Database } from './types'

export type TableName = keyof Database['public']['Tables']

export interface RealtimeEvent<T = any> {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  schema: string
  table: string
  commit_timestamp: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T
  errors: any[]
}

export class SupabaseRealtime {
  private channels: Map<string, RealtimeChannel> = new Map()

  constructor(private client: SupabaseClient<Database>) {}

  /**
   * Subscribe to postgres_changes on a table
   * Usage: subscribe('conversations', { event: '*', filter: `user_id=eq.${userId}` }, callback)
   */
  subscribe<T extends TableName>(
    table: T,
    callback: (event: RealtimeEvent) => void,
    options?: {
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
      filter?: string
    }
  ): string {
    const channelId = `${table}-${Date.now()}`

    const channel = this.client
      .channel(`public:${table}`)
      .on<RealtimeEvent>(
        'postgres_changes' as any,
        {
          event: options?.event || '*',
          schema: 'public',
          table: table as string,
          filter: options?.filter
        },
        callback
      )
      .subscribe()

    this.channels.set(channelId, channel)
    return channelId
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channelId: string) {
    const channel = this.channels.get(channelId)
    if (channel) {
      await this.client.removeChannel(channel)
      this.channels.delete(channelId)
    }
  }

  /**
   * Unsubscribe from all channels
   */
  async unsubscribeAll() {
    for (const [channelId] of this.channels) {
      await this.unsubscribe(channelId)
    }
  }
}
