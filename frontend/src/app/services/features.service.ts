import { Injectable, inject, signal } from '@angular/core';
import { GraphqlService } from './graphql.service';

/**
 * Descubre en runtime qué Core Assets opcionales están activos en este
 * producto (vía la query `coreAssetsActivos` del backend). Así, cualquier
 * módulo que se active con `add-feature.js` aparece en la UI sin tener
 * que hardcodear su visibilidad en cada componente.
 */
@Injectable({ providedIn: 'root' })
export class FeaturesService {
  private gql = inject(GraphqlService);

  private activos = signal<Set<string>>(new Set());
  private cargado = signal(false);

  cargar(): void {
    if (this.cargado()) return;
    this.gql.request<{ coreAssetsActivos: string[] }>(`query { coreAssetsActivos }`).subscribe({
      next: (d) => {
        this.activos.set(new Set(d.coreAssetsActivos));
        this.cargado.set(true);
      },
      error: () => this.cargado.set(true),
    });
  }

  isEnabled(assetId: string): boolean {
    return this.activos().has(assetId);
  }
}
