import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        // On gère la session nous-mêmes à partir du deep link,
        // pas besoin de persister entre onglets pour ce cas d'usage.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }

  /**
   * Établit la session Supabase à partir des tokens transmis par le deep link
   * en provenance de l'app mobile (access_token + refresh_token JWT Supabase).
   */
  async setSessionFromTokens(accessToken: string, refreshToken: string): Promise<Session | null> {
    const { data, error } = await this.client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      console.error('[SupabaseService] Échec de restauration de session :', error.message);
      return null;
    }
    return data.session;
  }

  async getCurrentSession(): Promise<Session | null> {
    const { data } = await this.client.auth.getSession();
    return data.session;
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }
}
