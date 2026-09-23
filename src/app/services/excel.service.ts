import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Registro, RegistroPersona, RegistroVehiculo } from '../models/registro.model';
import { EdificioService } from './edificio.service';

@Injectable({ providedIn: 'root' })
export class ExcelService {

  // Metodo original sin edificio (para compatibilidad)
  exportarRegistros(registros: Registro[], nombreArchivo: string): void {
    this.exportarRegistrosConEdificio(registros, nombreArchivo, null);
  }

  // Metodo nuevo con soporte de edificio
  exportarRegistrosConEdificio(
    registros: Registro[],
    nombreArchivo: string,
    edificioService: EdificioService | null
  ): void {

    const filas = registros.map(r => {
      const nombreEdificio = edificioService
        ? edificioService.getNombreEdificio((r as any).edificioId || '')
        : '';

      if (r.tipo === 'persona') {
        const p    = r as RegistroPersona;
        const fila: any = {
          'Tipo':           'Persona',
          'Nombres':        p.nombres,
          'Apellidos':      p.apellidos,
          'Tipo Documento': p.tipoDocumento,
          'Documento':      p.documento,
          'Empresa':        p.empresa || '',
          'Motivo':         p.motivo,
          'Hora Ingreso':   this.formatearFecha(p.horaIngreso),
          'Hora Salida':    p.horaSalida
            ? this.formatearFecha(p.horaSalida)
            : 'Dentro',
          'Estado':         p.estado === 'dentro' ? 'DENTRO' : 'SALIO',
          'Observaciones':  p.observaciones || '',
        };
        if (edificioService) fila['Edificio'] = nombreEdificio;
        return fila;
      } else {
        const v    = r as RegistroVehiculo;
        const fila: any = {
          'Tipo':           'Vehiculo',
          'Nombres':        v.conductor,
          'Apellidos':      '',
          'Tipo Documento': 'Cedula',
          'Documento':      v.documentoConductor,
          'Empresa':        v.empresa || '',
          'Motivo':         v.motivo,
          'Hora Ingreso':   this.formatearFecha(v.horaIngreso),
          'Hora Salida':    v.horaSalida
            ? this.formatearFecha(v.horaSalida)
            : 'Dentro',
          'Estado':         v.estado === 'dentro' ? 'DENTRO' : 'SALIO',
          'Observaciones':  `Placa: ${v.placa} | ${v.tipoVehiculo} | ${v.marca || ''} ${v.modelo || ''} ${v.color || ''}`.trim(),
        };
        if (edificioService) fila['Edificio'] = nombreEdificio;
        return fila;
      }
    });

    // Crear hoja principal
    const hoja = XLSX.utils.json_to_sheet(filas);
    hoja['!cols'] = [
      { wch: 10 },  // Tipo
      { wch: 20 },  // Nombres
      { wch: 20 },  // Apellidos
      { wch: 20 },  // Tipo Documento
      { wch: 15 },  // Documento
      { wch: 20 },  // Empresa
      { wch: 25 },  // Motivo
      { wch: 20 },  // Hora Ingreso
      { wch: 20 },  // Hora Salida
      { wch: 10 },  // Estado
      { wch: 30 },  // Observaciones
      { wch: 25 },  // Edificio
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Registros');

    // Hoja de resumen
    const resumen: any[] = [
      { 'Resumen': 'Total registros',    'Valor': registros.length },
      { 'Resumen': 'Personas',           'Valor': registros.filter(r => r.tipo === 'persona').length },
      { 'Resumen': 'Vehiculos',          'Valor': registros.filter(r => r.tipo === 'vehiculo').length },
      { 'Resumen': 'Actualmente dentro', 'Valor': registros.filter(r => r.estado === 'dentro').length },
      { 'Resumen': 'Salieron',           'Valor': registros.filter(r => r.estado === 'fuera').length },
      { 'Resumen': 'Generado el',        'Valor': this.formatearFecha(new Date()) },
    ];

    // Si hay edificioService agregar resumen por edificio
    if (edificioService) {
      const porEdificio = registros.reduce((acc: any, r) => {
        const id     = (r as any).edificioId || 'sin-edificio';
        const nombre = edificioService.getNombreEdificio(id);
        acc[nombre]  = (acc[nombre] || 0) + 1;
        return acc;
      }, {});

      resumen.push({ 'Resumen': '--- Por Edificio ---', 'Valor': '' });
      Object.entries(porEdificio).forEach(([nombre, total]) => {
        resumen.push({ 'Resumen': nombre, 'Valor': total });
      });
    }

    const hojaResumen = XLSX.utils.json_to_sheet(resumen);
    hojaResumen['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen');

    // Descargar
    const buffer = XLSX.write(libro, { bookType: 'xlsx', type: 'array' });
    const blob   = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, `${nombreArchivo}.xlsx`);
  }

  private formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleString('es-CO', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }
}