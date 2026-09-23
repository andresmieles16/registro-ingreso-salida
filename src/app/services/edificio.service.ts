import { Injectable } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import {
  collection, addDoc, getDocs,
  updateDoc, deleteDoc, doc, onSnapshot
} from 'firebase/firestore';
import { Edificio } from '../models/edificio.model';
import { signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EdificioService {

  private _edificios = signal<Edificio[]>([]);
  edificios = this._edificios.asReadonly();

  constructor(private firestore: Firestore) {
    this.cargarEdificios();
  }

  private cargarEdificios(): void {
    const db  = this.firestore as any;
    const ref = collection(db, 'edificios');
    onSnapshot(ref, (snapshot: any) => {
      const edificios = snapshot.docs.map((d: any) => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          fechaCreacion: data['fechaCreacion']?.toDate
            ? data['fechaCreacion'].toDate()
            : new Date(data['fechaCreacion']),
        } as Edificio;
      });
      this._edificios.set(edificios);
    });
  }

  async crearEdificio(
    nombre: string,
    direccion: string,
    telefono: string
  ): Promise<string> {
    const db  = this.firestore as any;
    const ref = await addDoc(collection(db, 'edificios'), {
      nombre,
      direccion,
      telefono,
      activo: true,
      fechaCreacion: new Date(),
    });
    return ref.id;
  }

  async actualizarEdificio(
    id: string,
    datos: Partial<Edificio>
  ): Promise<void> {
    const db  = this.firestore as any;
    const ref = doc(db, 'edificios', id);
    await updateDoc(ref, datos as any);
  }

  async toggleEdificio(id: string, activo: boolean): Promise<void> {
    const db  = this.firestore as any;
    const ref = doc(db, 'edificios', id);
    await updateDoc(ref, { activo });
  }

  async eliminarEdificio(id: string): Promise<void> {
    const db  = this.firestore as any;
    const ref = doc(db, 'edificios', id);
    await deleteDoc(ref);
  }

  getNombreEdificio(id: string): string {
    const e = this._edificios().find(e => e.id === id);
    return e ? e.nombre : 'Sin edificio';
  }
}