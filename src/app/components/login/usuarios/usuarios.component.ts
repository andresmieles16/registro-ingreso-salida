import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../services/auth.service';
import { EdificioService } from '../../../services/edificio.service';
import { Usuario } from '../../../models/usuario.model';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css'],
 imports: [
  CommonModule, TitleCasePipe, ReactiveFormsModule,
  MatCardModule, MatFormFieldModule, MatInputModule,
  MatSelectModule, MatButtonModule, MatIconModule,
  MatTableModule, MatSnackBarModule, MatChipsModule, MatTooltipModule,
]
})
export class UsuariosComponent implements OnInit {
  private authService     = inject(AuthService);
  public edificioService  = inject(EdificioService);
  private snackBar        = inject(MatSnackBar);
  private fb              = inject(FormBuilder);

  usuarios: Usuario[] = [];
  cargando            = false;
  mostrarFormulario   = false;
  verPassword         = false;
  columnas = ['nombre', 'rol', 'edificios', 'activo', 'acciones'];

  get edificios() {
    return this.edificioService.edificios();
  }

  get isSuperAdmin() {
    return this.authService.isSuperAdmin();
  }

  formulario = this.fb.group({
    nombre:       ['', Validators.required],
    email:        ['', [Validators.required, Validators.email]],
    password:     ['', [Validators.required, Validators.minLength(6)]],
    rol:          ['usuario', Validators.required],
    edificioId:   [''],
    edificiosIds: [[] as string[]],
  });

  async ngOnInit(): Promise<void> {
    await this.cargarUsuarios();
  }

  async cargarUsuarios(): Promise<void> {
    this.cargando = true;
    this.usuarios = await this.authService.obtenerUsuarios();
    this.cargando = false;
  }

  async crearUsuario(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.cargando = true;
    try {
      const { email, password, nombre, rol, edificioId, edificiosIds } =
        this.formulario.value;

      await this.authService.crearUsuario(
        email!,
        password!,
        nombre!,
        rol as any,
        rol === 'admin' ? null : edificioId || null,
        rol === 'admin' ? (edificiosIds || []) : []
      );

      this.snackBar.open('Usuario creado exitosamente', 'OK', { duration: 3000 });
      this.formulario.reset({ rol: 'usuario', edificiosIds: [] });
      this.mostrarFormulario = false;
      await this.cargarUsuarios();
    } catch (e: any) {
      const msg = e.code === 'auth/email-already-in-use'
        ? 'Este correo ya esta registrado'
        : 'Error al crear usuario';
      this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
    } finally {
      this.cargando = false;
    }
  }

  async toggleActivo(usuario: Usuario): Promise<void> {
    await this.authService.toggleUsuario(usuario.uid, !usuario.activo);
    this.snackBar.open(
      !usuario.activo ? 'Usuario activado' : 'Usuario desactivado',
      'OK', { duration: 2000 }
    );
    await this.cargarUsuarios();
  }

  async cambiarEdificios(uid: string, ids: string[]): Promise<void> {
    await this.authService.asignarEdificios(uid, ids);
    this.snackBar.open('Edificios asignados', 'OK', { duration: 2000 });
    await this.cargarUsuarios();
  }

  async cambiarEdificio(uid: string, edificioId: string): Promise<void> {
    await this.authService.asignarEdificio(uid, edificioId);
    this.snackBar.open('Edificio asignado', 'OK', { duration: 2000 });
    await this.cargarUsuarios();
  }

  async eliminarUsuario(uid: string, nombre: string): Promise<void> {
    if (confirm(`Eliminar usuario: ${nombre}?`)) {
      await this.authService.eliminarUsuario(uid);
      this.snackBar.open('Usuario eliminado', 'OK', { duration: 2000 });
      await this.cargarUsuarios();
    }
  }

  getNombresEdificios(ids: string[]): string {
    if (!ids || ids.length === 0) return 'Sin edificio';
    return ids
      .map(id => this.edificioService.getNombreEdificio(id))
      .join(', ');
  }

  tieneError(campo: string, error: string): boolean {
    const c = this.formulario.get(campo);
    return !!(c?.hasError(error) && c?.touched);
  }
}