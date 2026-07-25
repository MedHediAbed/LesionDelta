import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface DeepLinkParams {
  patientId: string;
  accessToken: string;
  refreshToken: string;
}

export class DeepLinkError extends Error {}

/**
 * Lien attendu, généré côté app mobile React Native, par ex. :
 *
 *   https://deltalesion.app/upload
 *     ?patientId=3f1b2c4a-...-uuid
 *     &access_token=eyJhbGciOi...
 *     &refresh_token=v1.Mabcd...
 *
 * En développement local (voir README), la même route est simplement
 * ouverte sur http://localhost:4200/upload?... via Linking.openURL()
 * côté RN, sans passer par un vrai Universal Link.
 */
@Injectable({ providedIn: 'root' })
export class DeepLinkService {
  constructor(
    private route: ActivatedRoute,
    private supabase: SupabaseService,
  ) {}

  /**
   * Lit les paramètres de la query string, initialise la session Supabase
   * et retourne l'ID patient à charger. Lève DeepLinkError si un paramètre
   * requis manque ou si l'authentification échoue.
   */
  async resolve(): Promise<DeepLinkParams> {
    const queryParams = await firstValueFrom(this.route.queryParamMap);

    const patientId = queryParams.get('patientId');
    const accessToken = queryParams.get('access_token');
    const refreshToken = queryParams.get('refresh_token');

    if (!patientId) {
      throw new DeepLinkError("Paramètre manquant : patientId");
    }
    if (!accessToken || !refreshToken) {
      throw new DeepLinkError("Lien invalide ou expiré : jeton d'authentification manquant");
    }

    const session = await this.supabase.setSessionFromTokens(accessToken, refreshToken);
    if (!session) {
      throw new DeepLinkError("Impossible d'authentifier le médecin. Le lien a peut-être expiré.");
    }

    return { patientId, accessToken, refreshToken };
  }
}
