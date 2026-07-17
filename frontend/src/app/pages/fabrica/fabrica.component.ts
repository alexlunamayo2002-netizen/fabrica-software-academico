import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GraphqlService } from '../../services/graphql.service';

interface CoreAssetInfo {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

// Interfaz gráfica de la fábrica: permite instalar Core Assets opcionales
// (Auditoría, Materias, Inscripciones) sin usar la terminal. Al instalar,
// el backend descarga el módulo, crea su tabla y se reinicia solo.
@Component({
  selector: 'app-fabrica',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './fabrica.component.html',
  styleUrls: ['./fabrica.component.scss']
})
export class FabricaComponent implements OnInit {
  private gql = inject(GraphqlService);

  catalogo = signal<CoreAssetInfo[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  instalando = signal<string | null>(null);
  reiniciando = signal(false);

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.gql.request<{ catalogoCoreAssets: CoreAssetInfo[] }>(`query { catalogoCoreAssets { id nombre descripcion activo } }`)
      .subscribe({
        next: d => { this.catalogo.set(d.catalogoCoreAssets); this.cargando.set(false); },
        error: err => { this.error.set(err.message); this.cargando.set(false); }
      });
  }

  instalar(asset: CoreAssetInfo) {
    if (asset.activo || this.instalando()) return;
    this.instalando.set(asset.id);
    this.error.set(null);

    const mutation = `
      mutation InstalarCoreAsset($assetId: String!) {
        instalarCoreAsset(assetId: $assetId) { ok mensaje instalados }
      }`;

    this.gql.request<{ instalarCoreAsset: { ok: boolean; mensaje: string; instalados: string[] } }>(mutation, { assetId: asset.id })
      .subscribe({
        next: () => {
          this.instalando.set(null);
          this.reiniciando.set(true);
          // El backend se reinicia solo (nodemon detecta el cambio); esperamos
          // a que vuelva a estar arriba y recargamos la app entera.
          this.esperarReinicioYRecargar();
        },
        error: err => { this.error.set(err.message); this.instalando.set(null); }
      });
  }

  private esperarReinicioYRecargar(intento = 0) {
    // Backoff simple: probamos cada 1.5s hasta 20 intentos (~30s máx).
    setTimeout(() => {
      this.gql.request<{ coreAssetsActivos: string[] }>(`query { coreAssetsActivos }`).subscribe({
        next: () => window.location.reload(),
        error: () => {
          if (intento < 20) this.esperarReinicioYRecargar(intento + 1);
          else window.location.reload();
        }
      });
    }, 1500);
  }
}
