import { Injectable, signal, computed, effect } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import {
  collection, onSnapshot, addDoc,
  updateDoc, doc, query, where, getDocs
} from 'firebase/firestore';
import { Registro, RegistroPersona, RegistroVehiculo } from '../models/registro.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RegistroService {

  private _registros = signal<Registro[]>([]);
  private unsubscribe: (() => void) | null = null;

  registros = this._registros.asReadonly();

  registrosDentro = computed(() =>
    this._registros().filter(r => r.estado === 'dentro')
  );

  personasDentro = computed(() =>
    this.registrosDentro().filter(r => r.tipo === 'persona').length
  );

  vehiculosDentro = computed(() =>
    this.registrosDentro().filter(r => r.tipo === 'vehiculo').length
  );

  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {
    // Recargar registros cuando cambia el usuario O el edificio seleccionado
    effect(() => {
      const usuario    = this.authService.usuarioActual();
      const edificioId = this.authService.edificioId();

      if (usuario === undefined) return;

      if (usuario === null) {
        if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = null;
        }
        this._registros.set([]);
        return;
      }

      if (usuario.rol !== 'superadmin' && !edificioId) {
        console.warn('Usuario sin edificioId:', usuario.email);
        this._registros.set([]);
        return;
      }

      console.log('Recargando registros para:', usuario.email, 'edificioId:', edificioId);
      this.cargarRegistros();
    });
  }

  private get edificioId(): string | null {
    return this.authService.edificioId();
  }

  private cargarRegistros(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    const db           = this.firestore as any;
    const usuario      = this.authService.usuarioActual();
    const edificioId   = this.authService.edificioId();
    const esSuperAdmin = usuario?.rol === 'superadmin';

    let ref: any;

    if (esSuperAdmin) {
      // Superadmin ve todo
      ref = collection(db, 'registros');
      console.log('SuperAdmin: cargando TODOS los registros');
    } else if (edificioId) {
      // Usuario o admin con edificio seleccionado
      ref = query(
        collection(db, 'registros'),
        where('edificioId', '==', edificioId)
      );
      console.log('Filtrando por edificioId:', edificioId);
    } else {
      this._registros.set([]);
      return;
    }

    this.unsubscribe = onSnapshot(ref,
      (snapshot: any) => {
        const registros = snapshot.docs.map((d: any) => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            horaIngreso: data['horaIngreso']?.toDate
              ? data['horaIngreso'].toDate()
              : new Date(data['horaIngreso']),
            horaSalida: data['horaSalida']?.toDate
              ? data['horaSalida'].toDate()
              : data['horaSalida']
                ? new Date(data['horaSalida'])
                : undefined,
          };
        });
        this._registros.set(registros as Registro[]);
        console.log('Registros cargados:', registros.length, 'para edificio:', edificioId);
      },
      (error: any) => {
        console.error('Error cargando registros:', error);
      }
    );
  }

  async buscarPorCedula(cedula: string): Promise<RegistroPersona | null> {
    try {
      const db         = this.firestore as any;
      const edificioId = this.edificioId;
      const ref        = collection(db, 'personas');
      const q          = edificioId
        ? query(ref, where('documento', '==', cedula), where('edificioId', '==', edificioId))
        : query(ref, where('documento', '==', cedula));
      const snapshot   = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].data() as RegistroPersona;
      }
      return null;
    } catch (e) {
      console.error('Error buscando cedula:', e);
      return null;
    }
  }

  async buscarPorPlaca(placa: string): Promise<RegistroVehiculo | null> {
    try {
      const db         = this.firestore as any;
      const edificioId = this.edificioId;
      const ref        = collection(db, 'vehiculos');
      const q          = edificioId
        ? query(ref, where('placa', '==', placa.toUpperCase()), where('edificioId', '==', edificioId))
        : query(ref, where('placa', '==', placa.toUpperCase()));
      const snapshot   = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].data() as RegistroVehiculo;
      }
      return null;
    } catch (e) {
      console.error('Error buscando placa:', e);
      return null;
    }
  }

  async verificarSiEstaAdentro(documento: string): Promise<boolean> {
    try {
      const db         = this.firestore as any;
      const edificioId = this.edificioId;
      const ref        = collection(db, 'registros');
      const q          = edificioId
        ? query(ref, where('documento', '==', documento), where('estado', '==', 'dentro'), where('edificioId', '==', edificioId))
        : query(ref, where('documento', '==', documento), where('estado', '==', 'dentro'));
      const snapshot   = await getDocs(q);
      return !snapshot.empty;
    } catch (e) {
      return false;
    }
  }

  async registrarPersona(
    datos: Omit<RegistroPersona, 'id' | 'horaIngreso' | 'estado'>
  ): Promise<void> {
    try {
      const db         = this.firestore as any;
      const edificioId = this.edificioId;
      const nuevo      = {
        ...datos,
        tipo: 'persona',
        horaIngreso: new Date(),
        estado: 'dentro',
        edificioId,
      };
      await addDoc(collection(db, 'registros'), nuevo);

      const ref      = collection(db, 'personas');
      const q        = edificioId
        ? query(ref, where('documento', '==', datos.documento), where('edificioId', '==', edificioId))
        : query(ref, where('documento', '==', datos.documento));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        await addDoc(ref, { ...datos, edificioId });
      }
    } catch (e) {
      console.error('Error registrando persona:', e);
      throw e;
    }
  }

  async registrarVehiculo(datos: any): Promise<void> {
    try {
      const db             = this.firestore as any;
      const edificioId     = this.edificioId;
      const ahora          = new Date();
      const nombreCompleto = `${datos.nombreConductor} ${datos.apellidoConductor}`.trim();

      const nuevoVehiculo = {
        tipo: 'vehiculo',
        placa: datos.placa.toUpperCase(),
        tipoVehiculo: datos.tipoVehiculo,
        marca: datos.marca || '',
        modelo: datos.modelo || '',
        color: datos.color || '',
        conductor: nombreCompleto,
        documentoConductor: datos.documentoConductor,
        empresa: datos.empresa || '',
        motivo: datos.motivo,
        observaciones: datos.observaciones || '',
        foto: datos.foto || null,
        horaIngreso: ahora,
        estado: 'dentro',
        edificioId,
      };
      await addDoc(collection(db, 'registros'), nuevoVehiculo);

      const nuevaPersona = {
        tipo: 'persona',
        nombres: datos.nombreConductor,
        apellidos: datos.apellidoConductor,
        tipoDocumento: 'Cedula de Ciudadania',
        documento: datos.documentoConductor,
        empresa: datos.empresa || '',
        motivo: `Conductor del vehiculo ${datos.placa.toUpperCase()}`,
        horaIngreso: ahora,
        estado: 'dentro',
        foto: datos.foto || null,
        observaciones: `Ingreso en vehiculo: ${datos.placa.toUpperCase()}`,
        edificioId,
      };
      await addDoc(collection(db, 'registros'), nuevaPersona);

      const refV  = collection(db, 'vehiculos');
      const qV    = edificioId
        ? query(refV, where('placa', '==', datos.placa.toUpperCase()), where('edificioId', '==', edificioId))
        : query(refV, where('placa', '==', datos.placa.toUpperCase()));
      const snapV = await getDocs(qV);
      if (snapV.empty) {
        await addDoc(refV, {
          placa: datos.placa.toUpperCase(),
          tipoVehiculo: datos.tipoVehiculo,
          marca: datos.marca || '',
          modelo: datos.modelo || '',
          color: datos.color || '',
          conductor: nombreCompleto,
          documentoConductor: datos.documentoConductor,
          empresa: datos.empresa || '',
          edificioId,
        });
      }

      const refP  = collection(db, 'personas');
      const qP    = edificioId
        ? query(refP, where('documento', '==', datos.documentoConductor), where('edificioId', '==', edificioId))
        : query(refP, where('documento', '==', datos.documentoConductor));
      const snapP = await getDocs(qP);
      if (snapP.empty) {
        await addDoc(refP, {
          nombres: datos.nombreConductor,
          apellidos: datos.apellidoConductor,
          tipoDocumento: 'Cedula de Ciudadania',
          documento: datos.documentoConductor,
          empresa: datos.empresa || '',
          edificioId,
        });
      }

    } catch (e) {
      console.error('Error registrando vehiculo:', e);
      throw e;
    }
  }

  async registrarSalida(id: string): Promise<void> {
    try {
      const db  = this.firestore as any;
      const ref = doc(db, 'registros', id);
      await updateDoc(ref, {
        horaSalida: new Date(),
        estado: 'fuera'
      });
    } catch (e) {
      console.error('Error registrando salida:', e);
      throw e;
    }
  }

  buscar(termino: string): Registro[] {
    if (!termino.trim()) return this._registros();
    const t = termino.toLowerCase();
    return this._registros().filter(r => {
      if (r.tipo === 'persona') {
        return r.nombres.toLowerCase().includes(t) ||
               r.apellidos.toLowerCase().includes(t) ||
               r.documento.toLowerCase().includes(t);
      }
      return r.placa.toLowerCase().includes(t) ||
             r.conductor.toLowerCase().includes(t);
    });
  }
}