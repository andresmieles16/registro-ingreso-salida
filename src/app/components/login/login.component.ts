import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

// ===== MODAL HABEAS DATA =====
@Component({
  selector: 'app-habeas-data-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="habeas-dialog">
      <div class="habeas-header">
        <div class="habeas-header-icon">
          <mat-icon>gavel</mat-icon>
        </div>
        <div>
          <h2>Tratamiento de Datos Personales</h2>
          <p>Política de Privacidad y Habeas Data</p>
        </div>
        <button mat-icon-button mat-dialog-close class="btn-close">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <mat-dialog-content class="habeas-content">
        <div class="fecha-vigencia">
          <mat-icon>calendar_today</mat-icon>
          <span>Fecha de vigencia: Enero 2025</span>
        </div>
        <div class="seccion">
          <div class="seccion-titulo"><span class="numero">1</span><h3>Responsable del Tratamiento</h3></div>
          <p>La empresa propietaria del Sistema de Control de Acceso es responsable del tratamiento de los datos personales recolectados a través de esta plataforma, de conformidad con la Ley 1581 de 2012 y el Decreto 1377 de 2013 de la República de Colombia.</p>
        </div>
        <div class="seccion">
          <div class="seccion-titulo"><span class="numero">2</span><h3>Datos Recolectados</h3></div>
          <p>El sistema recolecta y trata los siguientes datos personales:</p>
          <ul>
            <li><mat-icon>person</mat-icon> Nombres y apellidos</li>
            <li><mat-icon>badge</mat-icon> Número de documento de identidad</li>
            <li><mat-icon>face</mat-icon> Fotografía del rostro</li>
            <li><mat-icon>business</mat-icon> Empresa o entidad a la que pertenece</li>
            <li><mat-icon>schedule</mat-icon> Fecha y hora de ingreso y salida</li>
            <li><mat-icon>description</mat-icon> Motivo de la visita</li>
            <li><mat-icon>directions_car</mat-icon> Placas de vehículos</li>
          </ul>
        </div>
        <div class="seccion">
          <div class="seccion-titulo"><span class="numero">3</span><h3>Finalidad del Tratamiento</h3></div>
          <p>Los datos recolectados serán utilizados exclusivamente para:</p>
          <ul>
            <li><mat-icon>security</mat-icon> Control de acceso y seguridad de las instalaciones</li>
            <li><mat-icon>history</mat-icon> Registro histórico de ingresos y salidas</li>
            <li><mat-icon>gavel</mat-icon> Cumplimiento de obligaciones legales de seguridad</li>
            <li><mat-icon>assessment</mat-icon> Generación de reportes internos de gestión</li>
          </ul>
        </div>
        <div class="seccion">
          <div class="seccion-titulo"><span class="numero">4</span><h3>Derechos del Titular</h3></div>
          <p>Como titular de los datos, usted tiene derecho a conocer, actualizar, rectificar y suprimir sus datos personales. También tiene derecho a ser informado sobre el uso que se da a sus datos y a presentar quejas ante la Superintendencia de Industria y Comercio.</p>
        </div>
        <div class="seccion">
          <div class="seccion-titulo"><span class="numero">5</span><h3>Conservación de Datos</h3></div>
          <p>Los datos serán conservados durante el tiempo necesario para cumplir con las finalidades descritas y de acuerdo con las obligaciones legales vigentes. Las fotografías serán tratadas con especial protección al ser datos sensibles.</p>
        </div>
        <div class="seccion">
          <div class="seccion-titulo"><span class="numero">6</span><h3>Seguridad</h3></div>
          <p>El sistema implementa medidas técnicas y organizativas para proteger sus datos personales contra acceso no autorizado, pérdida o divulgación indebida.</p>
        </div>
        <div class="seccion">
          <div class="seccion-titulo"><span class="numero">7</span><h3>Contacto</h3></div>
          <p>Para ejercer sus derechos o resolver inquietudes sobre el tratamiento de sus datos personales, puede contactarnos a través del administrador del sistema en las instalaciones.</p>
        </div>
        <div class="aviso-final">
          <mat-icon>info</mat-icon>
          <span>Al ingresar a las instalaciones, usted autoriza el tratamiento de sus datos personales conforme a esta política.</span>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions class="habeas-footer">
        <button mat-raised-button color="primary" mat-dialog-close class="btn-entendido">
          <mat-icon>check_circle</mat-icon> Entendido y Acepto
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .habeas-dialog { display:flex; flex-direction:column; width:100%; }
    .habeas-header { display:flex; align-items:center; gap:14px; padding:20px 24px; background:linear-gradient(135deg,#1565c0,#1976d2); color:white; flex-shrink:0; }
    .habeas-header-icon { width:44px; height:44px; min-width:44px; background:rgba(255,255,255,0.2); border-radius:50%; display:flex; align-items:center; justify-content:center; }
    .habeas-header-icon mat-icon { font-size:22px; width:22px; height:22px; color:white; }
    .habeas-header h2 { margin:0 0 2px; font-size:16px; font-weight:700; }
    .habeas-header p { margin:0; font-size:12px; opacity:0.8; }
    .btn-close { margin-left:auto !important; color:white !important; }
    .habeas-content { padding:20px 24px !important; max-height:55vh !important; overflow-y:auto !important; }
    .fecha-vigencia { display:flex; align-items:center; gap:6px; font-size:12px; color:#999; font-style:italic; margin-bottom:20px; padding-bottom:12px; border-bottom:1px solid #f0f0f0; }
    .fecha-vigencia mat-icon { font-size:14px; width:14px; height:14px; }
    .seccion { margin-bottom:20px; }
    .seccion-titulo { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
    .numero { width:24px; height:24px; min-width:24px; background:#1565c0; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold; }
    .seccion-titulo h3 { margin:0; font-size:14px; font-weight:600; color:#1565c0; }
    .seccion p { font-size:13px; color:#555; line-height:1.7; margin:0 0 8px; padding-left:34px; }
    .seccion ul { list-style:none; padding:0 0 0 34px; margin:6px 0 0; }
    .seccion ul li { display:flex; align-items:center; gap:8px; font-size:13px; color:#555; padding:4px 0; border-bottom:1px solid #f5f5f5; }
    .seccion ul li:last-child { border-bottom:none; }
    .seccion ul li mat-icon { font-size:16px; width:16px; height:16px; color:#1565c0; flex-shrink:0; }
    .aviso-final { display:flex; align-items:flex-start; gap:10px; background:linear-gradient(135deg,#e3f2fd,#bbdefb); border-left:4px solid #1565c0; padding:14px 16px; border-radius:8px; margin-top:8px; font-size:13px; color:#1565c0; font-weight:500; line-height:1.5; }
    .aviso-final mat-icon { font-size:20px; width:20px; height:20px; flex-shrink:0; margin-top:1px; }
    .habeas-footer { padding:16px 24px !important; border-top:1px solid #e0e0e0; display:flex !important; justify-content:flex-end !important; margin:0 !important; }
    .btn-entendido { background:linear-gradient(135deg,#1565c0,#1976d2) !important; color:white !important; border-radius:8px !important; padding:0 24px !important; height:40px !important; font-weight:600 !important; }
  `]
})
export class HabeasDataDialogComponent {}

// ===== MODAL DE ALERTA (reemplaza snackbar) =====
@Component({
  selector: 'app-alerta-dialog',
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
    .alerta-dialog { display:flex; flex-direction:column; align-items:center; min-width:320px; max-width:420px; }
    .alerta-header { width:100%; padding:32px 24px 20px; display:flex; justify-content:center; border-radius:4px 4px 0 0; }
    .alerta-header.error    { background:linear-gradient(135deg,#c62828,#e53935); }
    .alerta-header.exito    { background:linear-gradient(135deg,#2e7d32,#43a047); }
    .alerta-header.info     { background:linear-gradient(135deg,#1565c0,#1976d2); }
    .alerta-header.warning  { background:linear-gradient(135deg,#e65100,#f57c00); }
    .alerta-icon-circle { width:64px; height:64px; background:rgba(255,255,255,0.2); border-radius:50%; display:flex; align-items:center; justify-content:center; border:3px solid rgba(255,255,255,0.5); }
    .alerta-icon-circle mat-icon { font-size:32px; width:32px; height:32px; color:white; }
    .alerta-body { padding:20px 24px 8px; text-align:center; }
    .alerta-body h3 { font-size:18px; font-weight:700; color:#1a1a2e; margin:0 0 8px; }
    .alerta-body p { font-size:14px; color:#666; line-height:1.6; margin:0; }
    .alerta-footer { padding:16px 24px 20px !important; display:flex !important; justify-content:center !important; margin:0 !important; }
    .btn-aceptar { border-radius:8px !important; padding:0 32px !important; height:42px !important; font-weight:600 !important; color:white !important; }
    .btn-aceptar.btn-error   { background:linear-gradient(135deg,#c62828,#e53935) !important; }
    .btn-aceptar.btn-exito   { background:linear-gradient(135deg,#2e7d32,#43a047) !important; }
    .btn-aceptar.btn-info    { background:linear-gradient(135deg,#1565c0,#1976d2) !important; }
    .btn-aceptar.btn-warning { background:linear-gradient(135deg,#e65100,#f57c00) !important; }
  `]
})
export class AlertaDialogComponent {
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

// ===== COMPONENTE LOGIN =====
@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatDialogModule,
  ],
})
export class LoginComponent {
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackBar    = inject(MatSnackBar);
  private dialog      = inject(MatDialog);
  private auth        = getAuth();

  cargando      = false;
  verPassword   = false;
  enviandoReset = false;

  formulario = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  // ===== MOSTRAR ALERTA MODAL =====
  private mostrarAlerta(
    tipo: 'error' | 'exito' | 'info' | 'warning',
    titulo: string,
    mensaje: string
  ): void {
    this.dialog.open(AlertaDialogComponent, {
      width: '400px',
      maxWidth: '95vw',
      panelClass: 'alerta-panel',
      data: { tipo, titulo, mensaje }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.cargando = true;
    try {
      const { email, password } = this.formulario.value;
      await this.authService.login(email!, password!);
    } catch (e: any) {
      let titulo  = 'Error al iniciar sesion';
      let mensaje = 'Verifica tus credenciales e intenta de nuevo.';
      if (e.code === 'auth/user-not-found') {
        titulo  = 'Usuario no encontrado';
        mensaje = 'No existe una cuenta con este correo electronico.';
      }
      if (e.code === 'auth/wrong-password') {
        titulo  = 'Contraseña incorrecta';
        mensaje = 'La contraseña ingresada no es correcta. Intenta de nuevo.';
      }
      if (e.code === 'auth/too-many-requests') {
        titulo  = 'Demasiados intentos';
        mensaje = 'Tu cuenta ha sido bloqueada temporalmente. Intenta mas tarde o recupera tu contraseña.';
      }
      if (e.message?.includes('desactivado')) {
        titulo  = 'Usuario desactivado';
        mensaje = e.message;
      }
      this.mostrarAlerta('error', titulo, mensaje);
    } finally {
      this.cargando = false;
    }
  }

  // ===== OLVIDASTE CONTRASEÑA =====
  async olvidastePassword(): Promise<void> {
    const email = this.formulario.get('email')?.value;

    if (!email) {
      this.mostrarAlerta(
        'info',
        'Correo requerido',
        'Ingresa tu correo electronico en el campo de arriba y luego presiona este boton para recuperar tu contraseña.'
      );
      this.formulario.get('email')?.markAsTouched();
      return;
    }

    if (this.formulario.get('email')?.hasError('email')) {
      this.mostrarAlerta(
        'warning',
        'Correo invalido',
        'El correo electronico ingresado no tiene un formato valido. Ejemplo: correo@dominio.com'
      );
      return;
    }

    this.enviandoReset = true;
    try {
      await sendPasswordResetEmail(this.auth, email);
      this.mostrarAlerta(
        'exito',
        'Correo enviado',
        `Se envio un correo de recuperacion a: ${email}. Revisa tu bandeja de entrada y sigue las instrucciones.`
      );
    } catch (e: any) {
      let titulo  = 'Error al enviar correo';
      let mensaje = 'No se pudo enviar el correo de recuperacion. Intenta de nuevo.';
      if (e.code === 'auth/user-not-found') {
        titulo  = 'Correo no registrado';
        mensaje = 'No existe una cuenta registrada con este correo electronico.';
      }
      this.mostrarAlerta('error', titulo, mensaje);
    } finally {
      this.enviandoReset = false;
    }
  }

  // ===== ABRIR MODAL HABEAS DATA =====
  abrirHabeasData(): void {
    this.dialog.open(HabeasDataDialogComponent, {
      width: '620px',
      maxWidth: '95vw',
      maxHeight: '92vh',
      panelClass: 'habeas-panel',
    });
  }

  tieneError(campo: string, error: string): boolean {
    const c = this.formulario.get(campo);
    return !!(c?.hasError(error) && c?.touched);
  }
}