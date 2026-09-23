import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EdificioService } from '../../services/edificio.service';
import { Edificio } from '../../models/edificio.model';

@Component({
  selector: 'app-edificios',
  standalone: true,
  templateUrl: './edificios.component.html',
  styleUrls: ['./edificios.component.css'],
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTableModule,
    MatSnackBarModule, MatChipsModule, MatTooltipModule,
  ]
})
export class EdificiosComponent implements OnInit {
  private edificioService = inject(EdificioService);
  private snackBar        = inject(MatSnackBar);
  private fb              = inject(FormBuilder);

  mostrarFormulario = false;
  cargando          = false;
  editando: Edificio | null = null;
  columnas = ['nombre', 'direccion', 'telefono', 'estado', 'acciones'];

  formulario = this.fb.group({
    nombre:    ['', Validators.required],
    direccion: ['', Validators.required],
    telefono:  ['', Validators.required],
  });

  get edificios() {
    return this.edificioService.edificios();
  }

  ngOnInit(): void {}

  abrirFormulario(edificio?: Edificio): void {
    this.mostrarFormulario = true;
    if (edificio) {
      this.editando = edificio;
      this.formulario.patchValue({
        nombre:    edificio.nombre,
        direccion: edificio.direccion,
        telefono:  edificio.telefono,
      });
    } else {
      this.editando = null;
      this.formulario.reset();
    }
  }

  cancelar(): void {
    this.mostrarFormulario = false;
    this.editando          = null;
    this.formulario.reset();
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando = true;
    const { nombre, direccion, telefono } = this.formulario.value;

    try {
      if (this.editando) {
        await this.edificioService.actualizarEdificio(this.editando.id, {
          nombre:    nombre!,
          direccion: direccion!,
          telefono:  telefono!,
        });
        this.snackBar.open('Edificio actualizado', 'OK', { duration: 3000 });
      } else {
        await this.edificioService.crearEdificio(
          nombre!, direccion!, telefono!
        );
        this.snackBar.open('Edificio creado exitosamente', 'OK', { duration: 3000 });
      }
      this.cancelar();
    } catch (e) {
      this.snackBar.open('Error al guardar el edificio', 'Cerrar', {
        duration: 3000
      });
    } finally {
      this.cargando = false;
    }
  }

  async toggleEdificio(edificio: Edificio): Promise<void> {
    await this.edificioService.toggleEdificio(edificio.id, !edificio.activo);
    const msg = !edificio.activo ? 'Edificio activado' : 'Edificio desactivado';
    this.snackBar.open(msg, 'OK', { duration: 2000 });
  }

  async eliminar(id: string, nombre: string): Promise<void> {
    if (confirm(`Eliminar edificio: ${nombre}?`)) {
      await this.edificioService.eliminarEdificio(id);
      this.snackBar.open('Edificio eliminado', 'OK', { duration: 2000 });
    }
  }
}