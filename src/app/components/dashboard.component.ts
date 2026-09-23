import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { RegistroService } from '../services/registro.service';
import { ExcelService } from '../services/excel.service';
import { EdificioService } from '../services/edificio.service';
import { AuthService } from '../services/auth.service';
import { Registro } from '../models/registro.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
  ]
})
export class DashboardComponent {

  hoy: Date              = new Date();
  fechaSeleccionada: Date = new Date();

  constructor(
    public registroService: RegistroService,
    private excelService:   ExcelService,
    public edificioService: EdificioService,
    public authService:     AuthService,
    private snackBar:       MatSnackBar
  ) {}

  // Registros del dia de hoy para la tabla
  get registrosHoy(): Registro[] {
    return this.registroService.registros().filter(r =>
      new Date(r.horaIngreso).toDateString() === this.hoy.toDateString()
    );
  }

  // Registros de la fecha seleccionada para descargar
  get registrosFechaSeleccionada(): Registro[] {
    return this.registroService.registros().filter(r =>
      new Date(r.horaIngreso).toDateString() === this.fechaSeleccionada.toDateString()
    );
  }

  get personasDentro(): number {
    return this.registroService.personasDentro();
  }

  get vehiculosDentro(): number {
    return this.registroService.vehiculosDentro();
  }

  getNombre(r: Registro): string {
    return r.tipo === 'persona'
      ? `${r.nombres} ${r.apellidos}`
      : r.placa;
  }

  getFechaStr(fecha: Date): string {
    return fecha.toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric',
      month: 'long', day: 'numeric'
    });
  }

  getNombreEdificio(): string {
    if (this.authService.isSuperAdmin()) return 'Todos los Edificios';
    return this.edificioService.getNombreEdificio(
      this.authService.edificioId() || ''
    );
  }

  // ===== EXPORTAR EXCEL =====
  exportarExcel(): void {
    const registros = this.registrosFechaSeleccionada;
    if (registros.length === 0) {
      this.snackBar.open(
        `No hay registros para el ${this.getFechaStr(this.fechaSeleccionada)}`,
        'OK',
        { duration: 3000 }
      );
      return;
    }
    const fechaStr = this.fechaSeleccionada.toISOString().split('T')[0];
    this.excelService.exportarRegistrosConEdificio(
      registros,
      `registros_${fechaStr}`,
      this.edificioService
    );
    this.snackBar.open(
      `Excel generado con ${registros.length} registros`,
      'OK',
      { duration: 3000 }
    );
  }

  // ===== EXPORTAR PDF =====
  descargarPDF(): void {
    const registros      = this.registrosFechaSeleccionada;
    const fechaStr       = this.getFechaStr(this.fechaSeleccionada);
    const nombreEdificio = this.getNombreEdificio();
    const doc            = new jsPDF();

    // Encabezado
    doc.setFillColor(21, 101, 192);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SISTEMA DE REGISTRO', 14, 13);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Edificio: ${nombreEdificio}`, 14, 22);
    doc.text('Control de Ingreso y Salida de Personas y Vehiculos', 14, 29);
    doc.setFontSize(10);
    doc.text(`Reporte del dia: ${fechaStr}`, 14, 36);

    // Resumen
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Total registros: ${registros.length}`, 14, 48);
    doc.text(
      `Personas: ${registros.filter(r => r.tipo === 'persona').length}`,
      80, 48
    );
    doc.text(
      `Vehiculos: ${registros.filter(r => r.tipo === 'vehiculo').length}`,
      150, 48
    );

    // Linea separadora
    doc.setDrawColor(21, 101, 192);
    doc.setLineWidth(0.5);
    doc.line(14, 52, 196, 52);

    if (registros.length > 0) {
      const filas = registros.map(r => [
        r.tipo === 'persona' ? 'Persona' : 'Vehiculo',
        this.getNombre(r),
        r.tipo === 'persona' ? r.documento : r.conductor,
        r.motivo,
        new Date(r.horaIngreso).toLocaleTimeString('es-CO', {
          hour: '2-digit', minute: '2-digit'
        }),
        r.horaSalida
          ? new Date(r.horaSalida).toLocaleTimeString('es-CO', {
              hour: '2-digit', minute: '2-digit'
            })
          : 'Dentro',
        r.estado === 'dentro' ? 'DENTRO' : 'SALIO',
      ]);

      autoTable(doc, {
        startY: 57,
        head: [['Tipo', 'Nombre / Placa', 'Documento', 'Motivo', 'Ingreso', 'Salida', 'Estado']],
        body: filas,
        headStyles: {
          fillColor: [21, 101, 192],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [50, 50, 50],
        },
        alternateRowStyles: {
          fillColor: [240, 245, 255],
        },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 38 },
          2: { cellWidth: 28 },
          3: { cellWidth: 38 },
          4: { cellWidth: 18 },
          5: { cellWidth: 18 },
          6: { cellWidth: 18 },
        },
      });
    } else {
      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      doc.text(`No hay registros para el ${fechaStr}.`, 14, 65);
    }

    // Pie de pagina
    const totalPaginas = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `${nombreEdificio} | Generado el ${new Date().toLocaleString('es-CO')} | Pagina ${i} de ${totalPaginas}`,
        14,
        doc.internal.pageSize.height - 8
      );
    }

    const fechaArchivo = this.fechaSeleccionada.toISOString().split('T')[0];
    doc.save(`registros_${fechaArchivo}.pdf`);

    this.snackBar.open(
      `PDF generado con ${registros.length} registros`,
      'OK',
      { duration: 3000 }
    );
  }
}
