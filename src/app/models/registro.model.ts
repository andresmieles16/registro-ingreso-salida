export type TipoVehiculo = 'carro' | 'moto' | 'camion' | 'bus' | 'bicicleta';
export type EstadoRegistro = 'dentro' | 'fuera';

export interface RegistroPersona {
  id: string;
  tipo: 'persona';
  nombres: string;
  apellidos: string;
  documento: string;
  tipoDocumento: string;
  empresa?: string;
  motivo: string;
  horaIngreso: Date;
  horaSalida?: Date;
  estado: EstadoRegistro;
  observaciones?: string;
  foto?: string | null;  // <- campo agregado
}

export interface RegistroVehiculo {
  id: string;
  tipo: 'vehiculo';
  placa: string;
  tipoVehiculo: TipoVehiculo;
  marca?: string;
  modelo?: string;
  color?: string;
  nombreConductor: string;
  apellidoConductor: string;
  conductor: string;
  documentoConductor: string;
  empresa?: string;
  motivo: string;
  horaIngreso: Date;
  horaSalida?: Date;
  estado: EstadoRegistro;
  observaciones?: string;
  foto?: string | null;  // <- campo agregado
}

export type Registro = RegistroPersona | RegistroVehiculo;
