import { Component, OnInit, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RegistroService } from '../services/registro.service';
import { ReconocimientoService } from '../services/reconocimiento.service';
import { CamaraComponent } from './camara.component';

// ===== MODAL DE ALERTA =====
@Component({
  selector: 'app-alerta-registro',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="alerta-dialog">
      <div class="alerta-header" [ngClass]="data.tipo">
        <div class="alerta-icon-circle">
          <mat-icon>{{ getIcono() }}</mat-icon>
        </div>
      </div>
      <div class="alerta-body">
        <h3>{{ data.titulo }}</h3>
        <p>{{ data.mensaje }}</p>
      </div>
      <mat-dialog-actions class="alerta-footer">
        <button mat-raised-button mat-dialog-close
                class="btn-aceptar"
                [ngClass]="'btn-' + data.tipo">
          <mat-icon>check</mat-icon> Aceptar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .alerta-dialog {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 320px;
      max-width: 420px;
    }
    .alerta-header {
      width: 100%;
      padding: 32px 24px 20px;
      display: flex;
      justify-content: center;
      border-radius: 4px 4px 0 0;
    }
    .alerta-header.error   { background: linear-gradient(135deg, #c62828, #e53935); }
    .alerta-header.exito   { background: linear-gradient(135deg, #2e7d32, #43a047); }
    .alerta-header.info    { background: linear-gradient(135deg, #1565c0, #1976d2); }
    .alerta-header.warning { background: linear-gradient(135deg, #e65100, #f57c00); }
    .alerta-icon-circle {
      width: 64px;
      height: 64px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid rgba(255,255,255,0.5);
    }
    .alerta-icon-circle mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: white;
    }
    .alerta-body {
      padding: 20px 24px 8px;
      text-align: center;
    }
    .alerta-body h3 {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 0 0 8px;
    }
    .alerta-body p {
      font-size: 14px;
      color: #666;
      line-height: 1.6;
      margin: 0;
    }
    .alerta-footer {
      padding: 16px 24px 20px !important;
      display: flex !important;
      justify-content: center !important;
      margin: 0 !important;
    }
    .btn-aceptar {
      border-radius: 8px !important;
      padding: 0 32px !important;
      height: 42px !important;
      font-weight: 600 !important;
      color: white !important;
    }
    .btn-aceptar.btn-error   { background: linear-gradient(135deg, #c62828, #e53935) !important; }
    .btn-aceptar.btn-exito   { background: linear-gradient(135deg, #2e7d32, #43a047) !important; }
    .btn-aceptar.btn-info    { background: linear-gradient(135deg, #1565c0, #1976d2) !important; }
    .btn-aceptar.btn-warning { background: linear-gradient(135deg, #e65100, #f57c00) !important; }
  `]
})
export class AlertaRegistroComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: {
    tipo: 'error' | 'exito' | 'info' | 'warning';
    titulo: string;
    mensaje: string;
  }) {}

  getIcono(): string {
    const iconos: Record<string, string> = {
      error:   'error_outline',
      exito:   'check_circle_outline',
      info:    'info_outline',
      warning: 'warning_amber',
    };
    return iconos[this.data.tipo] || 'info_outline';
  }
}

// ===== COMPONENTE REGISTRO PERSONA =====
@Component({
  selector: 'app-registro-persona',
  standalone: true,
  templateUrl: './registro-persona.component.html',
  styleUrls: ['./registro-persona.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatDialogModule,
    CamaraComponent,
  ]
})
export class RegistroPersonaComponent implements OnInit {

  private dialog = inject(MatDialog);

  formulario!: FormGroup;
  buscando           = false;
  encontrado         = false;
  fotoRegistro: string | null = null;
  modoReconocimiento = false;
  modoCamara         = false;
  reconociendo       = false;
  yaEstaAdentro      = false;

  tiposDocumento = [
    'Cedula de Ciudadania',
    'Cedula de Extranjeria',
    'Pasaporte',
    'Tarjeta de Identidad',
    'NIT'
  ];

  constructor(
    private fb: FormBuilder,
    private registroService: RegistroService,
    private reconocimientoService: ReconocimientoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.formulario = this.fb.group({
      nombres:       ['', [Validators.required, Validators.minLength(2)]],
      apellidos:     ['', [Validators.required, Validators.minLength(2)]],
      tipoDocumento: ['', Validators.required],
      documento:     ['', [Validators.required, Validators.minLength(5)]],
      empresa:       [''],
      motivo:        [''],
      observaciones: ['']
    });

    this.reconocimientoService.cargarModelos().catch(e =>
      console.warn('No se pudieron cargar modelos faciales:', e)
    );
  }

  // ===== MOSTRAR ALERTA MODAL =====
  private mostrarAlerta(
    tipo: 'error' | 'exito' | 'info' | 'warning',
    titulo: string,
    mensaje: string
  ): void {
    this.dialog.open(AlertaRegistroComponent, {
      width: '400px',
      maxWidth: '95vw',
      panelClass: 'alerta-panel',
      data: { tipo, titulo, mensaje }
    });
  }

  // ===== BUSCAR POR CEDULA =====
  async buscarPorCedula(): Promise<void> {
    const cedula = this.formulario.get('documento')?.value;
    if (!cedula || cedula.length < 5) return;

    this.buscando      = true;
    this.encontrado    = false;
    this.yaEstaAdentro = false;

    try {
      const estaAdentro = await this.registroService.verificarSiEstaAdentro(cedula);
      if (estaAdentro) {
        this.yaEstaAdentro = true;
        this.mostrarAlerta(
          'warning',
          'Persona ya dentro',
          'Esta persona ya se encuentra dentro de las instalaciones. Debe registrar su salida antes de volver a ingresar.'
        );
        this.buscando = false;
        return;
      }

      const persona = await this.registroService.buscarPorCedula(cedula);
      if (persona) {
        this.formulario.patchValue({
          nombres:       persona.nombres,
          apellidos:     persona.apellidos,
          tipoDocumento: persona.tipoDocumento,
          empresa:       persona.empresa || '',
        });
        this.encontrado = true;
        this.mostrarAlerta(
          'info',
          'Persona encontrada',
          `Se cargaron los datos de: ${persona.nombres} ${persona.apellidos}. Verifica los datos y completa el registro.`
        );
      } else {
        this.mostrarAlerta(
          'info',
          'Cedula no encontrada',
          'No se encontraron datos previos para esta cedula. Por favor complete los datos manualmente.'
        );
      }
    } catch (e) {
      console.error('Error buscando cedula:', e);
    } finally {
      this.buscando = false;
    }
  }

  // ===== RECONOCIMIENTO FACIAL =====
  activarReconocimiento(): void {
    this.modoReconocimiento = true;
    this.modoCamara         = false;
    this.yaEstaAdentro      = false;
  }

  async onFotoParaReconocimiento(foto: string): Promise<void> {
    this.modoReconocimiento = false;
    this.reconociendo       = true;

    try {
      const persona = await this.reconocimientoService.buscarPorCara(foto);

      if (persona) {
        const estaAdentro = await this.registroService.verificarSiEstaAdentro(
          persona.documento
        );

        if (estaAdentro) {
          this.yaEstaAdentro = true;
          this.formulario.patchValue({
            nombres:   persona.nombres,
            apellidos: persona.apellidos,
            documento: persona.documento,
          });
          this.mostrarAlerta(
            'warning',
            'Persona ya dentro',
            `${persona.nombres} ${persona.apellidos} ya se encuentra dentro de las instalaciones.`
          );
          return;
        }

        this.mostrarAlerta(
          'info',
          'Persona identificada',
          `Se identificó a: ${persona.nombres} ${persona.apellidos}. Registrando ingreso automáticamente...`
        );

        setTimeout(async () => {
          try {
            const datos = {
              nombres:       persona.nombres,
              apellidos:     persona.apellidos,
              tipoDocumento: persona.tipoDocumento,
              documento:     persona.documento,
              empresa:       persona.empresa || '',
              motivo:        'Ingreso por reconocimiento facial',
              observaciones: '',
              foto:          persona.foto || null,
            };
            await this.registroService.registrarPersona(datos as any);
            this.mostrarAlerta(
              'exito',
              'Ingreso Registrado',
              `El ingreso de ${persona.nombres} ${persona.apellidos} fue registrado exitosamente.`
            );
            setTimeout(() => this.router.navigate(['/dashboard']), 1500);
          } catch (e) {
            this.mostrarAlerta(
              'error',
              'Error al registrar',
              'No se pudo registrar el ingreso. Por favor intenta de nuevo.'
            );
          }
        }, 2000);

      } else {
        this.mostrarAlerta(
          'warning',
          'Rostro no reconocido',
          'No se pudo identificar a la persona. Por favor complete los datos del formulario manualmente.'
        );
      }

    } catch (e) {
      console.error('Error en reconocimiento:', e);
      this.mostrarAlerta(
        'error',
        'Error de reconocimiento',
        'Ocurrio un error en el reconocimiento facial. Por favor intenta de nuevo.'
      );
    } finally {
      this.reconociendo = false;
    }
  }

  // ===== CAMARA FOTO DEL VISITANTE =====
  abrirCamaraFoto(): void {
    this.modoCamara         = true;
    this.modoReconocimiento = false;
  }

  onFotoRegistroCaptada(foto: string): void {
    this.fotoRegistro = foto;
    this.modoCamara   = false;
  }

  // ===== ENVIAR FORMULARIO MANUAL =====
  async onSubmit(): Promise<void> {
    if (!this.fotoRegistro) {
      this.mostrarAlerta(
        'warning',
        'Foto requerida',
        'Debes tomar una foto del visitante antes de registrar el ingreso.'
      );
      this.modoCamara = true;
      return;
    }

    if (this.formulario.valid) {
      const documento   = this.formulario.get('documento')?.value;
      const estaAdentro = await this.registroService.verificarSiEstaAdentro(documento);

      if (estaAdentro) {
        this.yaEstaAdentro = true;
        this.mostrarAlerta(
          'warning',
          'Persona ya dentro',
          'Esta persona ya se encuentra dentro de las instalaciones. Debe registrar su salida antes de volver a ingresar.'
        );
        return;
      }

      try {
        const datos = {
          ...this.formulario.value,
          foto: this.fotoRegistro
        };
        await this.registroService.registrarPersona(datos as any);
        this.mostrarAlerta(
          'exito',
          'Ingreso Registrado',
          'El ingreso fue registrado exitosamente. Redirigiendo al dashboard...'
        );
        setTimeout(() => this.router.navigate(['/dashboard']), 1500);
      } catch (e) {
        this.mostrarAlerta(
          'error',
          'Error al registrar',
          'No se pudo registrar el ingreso. Por favor intenta de nuevo.'
        );
      }
    } else {
      this.formulario.markAllAsTouched();
      this.mostrarAlerta(
        'warning',
        'Formulario incompleto',
        'Por favor completa todos los campos obligatorios antes de registrar.'
      );
    }
  }

  limpiarFormulario(): void {
    this.formulario.reset();
    this.encontrado         = false;
    this.fotoRegistro       = null;
    this.modoReconocimiento = false;
    this.modoCamara         = false;
    this.reconociendo       = false;
    this.yaEstaAdentro      = false;
  }

  tieneError(campo: string, error: string): boolean {
    const c = this.formulario.get(campo);
    return !!(c?.hasError(error) && c?.touched);
  }
}
