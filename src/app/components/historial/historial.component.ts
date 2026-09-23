import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { RegistroService } from '../../services/registro.service';
import { ExcelService } from '../../services/excel.service';
import { EdificioService } from '../../services/edificio.service';
import { AuthService } from '../../services/auth.service';
import { Registro } from '../../models/registro.model';

@Component({
  selector: 'app-historial',
  standalone: true,
  templateUrl: './historial.component.html',
  styleUrls: ['./historial.component.css'],
  imports: [
    CommonModule, FormsModule, DatePipe,
    MatTableModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatChipsModule, MatButtonModule,
    MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    MatTooltipModule, MatSnackBarModule,
  ],
})
export class HistorialComponent {
  public svc             = inject(RegistroService);
  public authService     = inject(AuthService);
  public edificioService = inject(EdificioService);
  private excel          = inject(ExcelService);
  private snackBar       = inject(MatSnackBar);

  termino        = signal('');
  filtroTipo     = signal('todos');
  filtroEstado   = signal('todos');
  filtroEdificio = signal('todos');
  fechaDesde     = signal<Date | null>(null);
  fechaHasta     = signal<Date | null>(null);
  hoy            = new Date();

  // Columnas dinamicas segun rol
  get columnas(): string[] {
    if (this.authService.isSuperAdmin()) {
      return ['tipo', 'nombre', 'doc', 'edificio', 'estado', 'ingreso', 'salida', 'duracion'];
    }
    return ['tipo', 'nombre', 'doc', 'estado', 'ingreso', 'salida', 'duracion'];
  }

  registrosFiltrados = computed(() => {
    let lista = this.svc.registros();

    if (this.filtroTipo() !== 'todos') {
      lista = lista.filter(r => r.tipo === this.filtroTipo());
    }

    if (this.filtroEstado() !== 'todos') {
      lista = lista.filter(r => r.estado === this.filtroEstado());
    }

    // Filtro por edificio solo superadmin
    if (this.filtroEdificio() !== 'todos') {
      lista = lista.filter(r => (r as any).edificioId === this.filtroEdificio());
    }

    if (this.fechaDesde()) {
      const desde = new Date(this.fechaDesde()!);
      desde.setHours(0, 0, 0, 0);
      lista = lista.filter(r => new Date(r.horaIngreso) >= desde);
    }

    if (this.fechaHasta()) {
      const hasta = new Date(this.fechaHasta()!);
      hasta.setHours(23, 59, 59, 999);
      lista = lista.filter(r => new Date(r.horaIngreso) <= hasta);
    }

    if (this.termino().trim()) {
      const t = this.termino().toLowerCase();
      lista = lista.filter(r => {
        if (r.tipo === 'persona') {
          return r.nombres.toLowerCase().includes(t)   ||
                 r.apellidos.toLowerCase().includes(t) ||
                 r.documento.toLowerCase().includes(t);
        }
        return r.placa.toLowerCase().includes(t) ||
               r.conductor.toLowerCase().includes(t);
      });
    }

    return [...lista].sort((a, b) =>
      new Date(b.horaIngreso).getTime() - new Date(a.horaIngreso).getTime()
    );
  });

  onBuscar(e: Event): void {
    this.termino.set((e.target as HTMLInputElement).value);
  }

  // ===== ATAJOS RAPIDOS =====
  filtrarHoy(): void {
    const d     = new Date();
    const desde = new Date(d); desde.setHours(0, 0, 0, 0);
    const hasta = new Date(d); hasta.setHours(23, 59, 59, 999);
    this.fechaDesde.set(desde);
    this.fechaHasta.set(hasta);
  }

  filtrarAyer(): void {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const desde = new Date(d); desde.setHours(0, 0, 0, 0);
    const hasta = new Date(d); hasta.setHours(23, 59, 59, 999);
    this.fechaDesde.set(desde);
    this.fechaHasta.set(hasta);
  }

  filtrarEstaSemana(): void {
    const hoy   = new Date();
    const lunes = new Date(hoy);
    const dia   = hoy.getDay();
    lunes.setDate(hoy.getDate() + (dia === 0 ? -6 : 1 - dia));
    lunes.setHours(0, 0, 0, 0);
    this.fechaDesde.set(lunes);
    this.fechaHasta.set(null);
  }

  filtrarEsteMes(): void {
    const hoy    = new Date();
    const primer = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    primer.setHours(0, 0, 0, 0);
    this.fechaDesde.set(primer);
    this.fechaHasta.set(null);
  }

  limpiarFiltros(): void {
    this.termino.set('');
    this.filtroTipo.set('todos');
    this.filtroEstado.set('todos');
    this.filtroEdificio.set('todos');
    this.fechaDesde.set(null);
    this.fechaHasta.set(null);
  }

  // ===== HELPERS =====
  getNombre(r: Registro): string {
    return r.tipo === 'persona'
      ? `${r.nombres} ${r.apellidos}`
      : r.placa;
  }

  getNombreEdificio(r: any): string {
    return this.edificioService.getNombreEdificio((r as any).edificioId || '');
  }

  getDuracion(r: Registro): string {
    if (!r.horaSalida) return 'Aun dentro';
    const mins = Math.floor(
      (+new Date(r.horaSalida) - +new Date(r.horaIngreso)) / 60000
    );
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  // ===== EXPORTAR EXCEL =====
  exportarExcel(): void {
    const registros = this.registrosFiltrados();
    if (registros.length === 0) {
      this.snackBar.open('No hay registros para exportar', 'OK', { duration: 3000 });
      return;
    }
    const fecha = new Date().toISOString().split('T')[0];
    this.excel.exportarRegistrosConEdificio(
      registros,
      `historial_${fecha}`,
      this.edificioService
    );
    this.snackBar.open(
      `Excel generado con ${registros.length} registros`,
      'OK',
      { duration: 3000 }
    );
  }

  // ===== EXPORTAR PDF =====
  exportarPDF(): void {
    const registros = this.registrosFiltrados();
    if (registros.length === 0) {
      this.snackBar.open('No hay registros para exportar', 'OK', { duration: 3000 });
      return;
    }

    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then(({ default: autoTable }) => {
        const doc          = new jsPDF();
        const hoy          = new Date();
        const esSuperAdmin = this.authService.isSuperAdmin();
        const nombreEdificio = esSuperAdmin
          ? 'Todos los Edificios'
          : this.edificioService.getNombreEdificio(
              this.authService.edificioId() || ''
            );

        // Encabezado
        doc.setFillColor(21, 101, 192);
        doc.rect(0, 0, 210, 38, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('HISTORIAL DE REGISTROS', 14, 13);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Edificio: ${nombreEdificio}`, 14, 22);
        doc.text(`Generado el ${hoy.toLocaleString('es-CO')}`, 14, 29);
        doc.text(`Total: ${registros.length} registros`, 14, 36);

        let startY = 45;
        if (this.fechaDesde() || this.fechaHasta()) {
          const desde = this.fechaDesde()
            ? this.fechaDesde()!.toLocaleDateString('es-CO') : 'Inicio';
          const hasta = this.fechaHasta()
            ? this.fechaHasta()!.toLocaleDateString('es-CO') : 'Hoy';
          doc.setTextColor(50, 50, 50);
          doc.setFontSize(10);
          doc.text(`Periodo: ${desde} — ${hasta}`, 14, 43);
          startY = 50;
        }

        // Columnas segun rol
        const head = esSuperAdmin
          ? [['Tipo', 'Nombre/Placa', 'Documento', 'Edificio', 'Estado', 'Ingreso', 'Salida', 'Duracion']]
          : [['Tipo', 'Nombre/Placa', 'Documento', 'Estado', 'Ingreso', 'Salida', 'Duracion']];

        const filas = registros.map(r => {
          const base: string[] = [
            r.tipo === 'persona' ? 'Persona' : 'Vehiculo',
            this.getNombre(r),
            r.tipo === 'persona' ? r.documento : r.conductor,
          ];
          if (esSuperAdmin) {
            base.push(this.getNombreEdificio(r));
          }
          base.push(
            r.estado === 'dentro' ? 'DENTRO' : 'SALIO',
            new Date(r.horaIngreso).toLocaleString('es-CO'),
            r.horaSalida ? new Date(r.horaSalida).toLocaleString('es-CO') : '-',
            this.getDuracion(r)
          );
          return base;
        });

        autoTable(doc, {
          startY,
          head,
          body: filas,
          headStyles: { fillColor: [21, 101, 192], textColor: 255, fontSize: 8 },
          bodyStyles: { fontSize: 7 },
          alternateRowStyles: { fillColor: [240, 245, 255] },
        });

        doc.save(`historial_${hoy.toISOString().split('T')[0]}.pdf`);
        this.snackBar.open('PDF generado', 'OK', { duration: 3000 });
      });
    });
  }
}