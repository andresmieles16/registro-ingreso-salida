import { Component, inject } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RegistroService } from '../services/registro.service';
import { TipoVehiculo } from '../models/registro.model';

@Component({
  selector: 'app-registro-vehiculo',
  standalone: true,
  templateUrl: './registro-vehiculo.component.html',
  styleUrls: ['./registro-vehiculo.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TitleCasePipe,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatProgressSpinnerModule,
  ],
})
export class RegistroVehiculoComponent {
  private fb       = inject(FormBuilder);
  private svc      = inject(RegistroService);
  private snackBar = inject(MatSnackBar);
  private router   = inject(Router);

  tiposVehiculo: TipoVehiculo[] = ['carro', 'moto', 'camion', 'bus', 'bicicleta'];
  buscando:  boolean = false;
  encontrado: boolean = false;

  formulario = this.fb.group({
    placa:              ['', [Validators.required, Validators.minLength(3)]],
    tipoVehiculo:       ['', Validators.required],
    marca:              [''],
    modelo:             [''],
    color:              [''],
    nombreConductor:    ['', Validators.required],
    apellidoConductor:  ['', Validators.required],
    documentoConductor: ['', Validators.required],
    empresa:            [''],
    motivo:             [''],
    observaciones:      [''],
  });

  async buscarPorPlaca(): Promise<void> {
    const placa = this.formulario.get('placa')?.value;
    if (!placa || placa.length < 3) return;

    this.buscando   = true;
    this.encontrado = false;

    try {
      const vehiculo = await this.svc.buscarPorPlaca(placa);
      if (vehiculo) {
        const partes   = vehiculo.conductor.split(' ');
        const nombre   = partes[0] || '';
        const apellido = partes.slice(1).join(' ') || '';

        this.formulario.patchValue({
          tipoVehiculo:       vehiculo.tipoVehiculo,
          marca:              vehiculo.marca              || '',
          modelo:             vehiculo.modelo             || '',
          color:              vehiculo.color              || '',
          nombreConductor:    nombre,
          apellidoConductor:  apellido,
          documentoConductor: vehiculo.documentoConductor,
          empresa:            vehiculo.empresa            || '',
        });
        this.encontrado = true;
        this.snackBar.open(
          `Vehiculo encontrado: ${vehiculo.placa} - ${vehiculo.conductor}`,
          'OK',
          { duration: 3000 }
        );
      } else {
        this.snackBar.open(
          'Placa no encontrada. Complete los datos manualmente.',
          'OK',
          { duration: 3000 }
        );
      }
    } catch (e) {
      console.error('Error buscando placa:', e);
    } finally {
      this.buscando = false;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.formulario.valid) {
      try {
        await this.svc.registrarVehiculo(this.formulario.value);
        this.snackBar.open('Vehiculo registrado!', 'OK', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      } catch (e) {
        this.snackBar.open('Error al registrar. Intenta de nuevo.', 'Cerrar', {
          duration: 3000
        });
      }
    } else {
      this.formulario.markAllAsTouched();
    }
  }

  limpiar(): void {
    this.formulario.reset();
    this.encontrado = false;
  }

  tieneError(campo: string, error: string): boolean {
    const ctrl = this.formulario.get(campo);
    return !!(ctrl?.hasError(error) && ctrl?.touched);
  }
}
