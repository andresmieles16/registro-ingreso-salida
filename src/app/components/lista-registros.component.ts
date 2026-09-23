import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RegistroService } from '../services/registro.service';
import { ReconocimientoService } from '../services/reconocimiento.service';
import { EdificioService } from '../services/edificio.service';
import { AuthService } from '../services/auth.service';
import { Registro } from '../models/registro.model';
import { CamaraComponent } from './camara.component';

@Component({
  selector: 'app-lista-registros',
  standalone: true,
  templateUrl: './lista-registros.component.html',
  styleUrls: ['./lista-registros.component.css'],
  imports: [
    CommonModule, FormsModule,
    DatePipe, TitleCasePipe,
    MatTableModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatTooltipModule, MatSnackBarModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    CamaraComponent,
  ],
})
export class ListaRegistrosComponent {
  public svc              = inject(RegistroService);
  public authService      = inject(AuthService);
  public edificioService  = inject(EdificioService);
  private snackBar        = inject(MatSnackBar);
  private reconocimiento  = inject(ReconocimientoService);

  terminoBusqueda    = signal('');
  modoSalidaFacial   = false;
  reconociendoSalida = false;

  // --- Modal de identificación ---
  modalVisible       = false;
  modalNombre        = '';
  modalFoto          = '';
  modalEstado: 'identificando' | 'exito' | 'error' | 'noEncontrado' = 'identificando';
  modalMensaje       = '';
  private modalTimer: any;

  get columnas(): string[] {
    if (this.authService.isSuperAdmin()) {
      return ['foto', 'tipo', 'nombre', 'identificacion', 'edificio', 'motivo', 'horaIngreso', 'acciones'];
    }
    return ['foto', 'tipo', 'nombre', 'identificacion', 'motivo', 'horaIngreso', 'acciones'];
  }

  esAdminNoSuper(): boolean {
    return this.authService.isAdmin() && !this.authService.isSuperAdmin();
  }

  registrosFiltrados = computed(() => {
    const termino = this.terminoBusqueda().toLowerCase().trim();
    const todos   = this.svc.registrosDentro();
    if (!termino) return todos;
    return todos.filter(r => {
      if (r.tipo === 'persona') {
        return r.nombres.toLowerCase().includes(termino)            ||
               r.apellidos.toLowerCase().includes(termino)          ||
               r.documento.toLowerCase().includes(termino)          ||
               r.motivo.toLowerCase().includes(termino);
      } else {
        return r.placa.toLowerCase().includes(termino)              ||
               r.conductor.toLowerCase().includes(termino)          ||
               r.documentoConductor.toLowerCase().includes(termino) ||
               r.motivo.toLowerCase().includes(termino);
      }
    });
  });

  onBuscar(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.terminoBusqueda.set(valor);
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda.set('');
  }

  async registrarSalida(id: string, nombre: string): Promise<void> {
    if (this.esAdminNoSuper()) return;
    if (confirm(`Confirmar salida de: ${nombre}?`)) {
      await this.svc.registrarSalida(id);
      this.snackBar.open(`Salida registrada: ${nombre}`, 'OK', { duration: 3000 });
    }
  }

  activarSalidaFacial(): void {
    if (this.esAdminNoSuper()) return;
    this.modoSalidaFacial   = true;
    this.reconociendoSalida = false;
    this.reconocimiento.cargarModelos().catch(e =>
      console.warn('Error cargando modelos:', e)
    );
  }

  abrirModal(nombre: string, foto: string, estado: typeof this.modalEstado, mensaje: string): void {
    clearTimeout(this.modalTimer);
    this.modalNombre  = nombre;
    this.modalFoto    = foto;
    this.modalEstado  = estado;
    this.modalMensaje = mensaje;
    this.modalVisible = true;
  }

  cerrarModal(): void {
    clearTimeout(this.modalTimer);
    this.modalVisible = false;
  }

  private cerrarModalConDelay(ms: number): void {
    this.modalTimer = setTimeout(() => this.cerrarModal(), ms);
  }

  async onFotoParaSalida(foto: string): Promise<void> {
    this.modoSalidaFacial   = false;
    this.reconociendoSalida = true;

    this.abrirModal('', foto, 'identificando', 'Analizando rostro...');

    try {
      const persona = await this.reconocimiento.buscarPorCara(foto);

      if (!persona) {
        this.reconociendoSalida = false;
        this.abrirModal('Desconocido', foto, 'noEncontrado',
          'Rostro no reconocido. Registra la salida manualmente.');
        this.cerrarModalConDelay(5000);
        return;
      }

      const nombreCompleto = `${persona.nombres} ${persona.apellidos}`;

      const registroDentro = this.svc.registrosDentro().find(r => {
        if (r.tipo === 'persona') return r.documento === persona.documento;
        return false;
      });

      if (!registroDentro) {
        this.reconociendoSalida = false;
        this.abrirModal(nombreCompleto, foto, 'noEncontrado',
          `${nombreCompleto} no se encuentra dentro del edificio actualmente.`);
        this.cerrarModalConDelay(5000);
        return;
      }

      this.abrirModal(nombreCompleto, foto, 'identificando',
        'Persona identificada. Registrando salida...');

      setTimeout(async () => {
        try {
          await this.svc.registrarSalida(registroDentro.id);
          this.reconociendoSalida = false;
          this.abrirModal(nombreCompleto, foto, 'exito',
            'Salida registrada exitosamente.');
          this.cerrarModalConDelay(4000);
        } catch (e) {
          this.reconociendoSalida = false;
          this.abrirModal(nombreCompleto, foto, 'error',
            'Error al registrar la salida. Intenta de nuevo.');
          this.cerrarModalConDelay(3000);
        }
      }, 2000);

    } catch (e) {
      console.error('Error en reconocimiento para salida:', e);
      this.reconociendoSalida = false;
      this.abrirModal('', foto, 'error',
        'Error en reconocimiento facial. Intenta de nuevo.');
      this.cerrarModalConDelay(3000);
    }
  }

  getNombre(r: Registro): string {
    return r.tipo === 'persona'
      ? `${r.nombres} ${r.apellidos}`
      : r.placa;
  }

  getDoc(r: Registro): string {
    return r.tipo === 'persona' ? r.documento : r.conductor;
  }

  getNombreEdificio(r: any): string {
    return this.edificioService.getNombreEdificio(r.edificioId || '');
  }
}