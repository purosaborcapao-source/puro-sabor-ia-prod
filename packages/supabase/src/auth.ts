import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

export class SupabaseAuth {
  constructor(private client: SupabaseClient<Database>) {}

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password })
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string) {
    return this.client.auth.signUp({ email, password })
  }

  /**
   * Sign out current user
   */
  async signOut() {
    return this.client.auth.signOut()
  }

  /**
   * Get current session
   */
  async getSession() {
    return this.client.auth.getSession()
  }

  /**
   * Get current user
   */
  async getUser() {
    return this.client.auth.getUser()
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(
    callback: Parameters<typeof this.client.auth.onAuthStateChange>[0]
  ) {
    return this.client.auth.onAuthStateChange(callback)
  }

  /**
   * Reset password via email
   */
  async resetPassword(email: string) {
    return this.client.auth.resetPasswordForEmail(email)
  }

  /**
   * Update user with new password
   */
  async updatePassword(password: string) {
    return this.client.auth.updateUser({ password })
  }
}
