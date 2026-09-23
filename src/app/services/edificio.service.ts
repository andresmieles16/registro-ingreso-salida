import { Injectable, signal } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';

import {
  onAuthStateChanged,
  Unsubscribe as AuthUnsubscribe
} from 'firebase/auth';

import { Edificio } from '../models/edificio.model';

@Injectable({ providedIn: 'root' })
export class EdificioService {
  private _edificios = signal<Edificio[]>([]);
  edificios = this._edificios.asReadonly();

  // Guarda el listener de Firestore para poder cerrarlo.
  private cancelarListenerEdificios: Unsubscribe | null = null;

  // Guarda el listener de Firebase Auth para poder cerrarlo si se necesitara.
  private cancelarListenerAuth: AuthUnsubscribe | null = null;

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {
    this.esperarAutenticacion();
  }

  private esperarAutenticacion(): void {
    this.cancelarListenerAuth = onAuthStateChanged(
      this.auth,
      (usuario) => {
        // Si había una escucha anterior de edificios, detenla.
        if (this.cancelarListenerEdificios) {
          this.cancelarListenerEdificios();
          this.cancelarListenerEdificios = null;
        }

        // Cuando no existe sesión, limpia el listado y NO consulta Firestore.
        if (!usuario) {
          this._edificios.set([]);
          console.log('Edificios: sin sesión activa; no se inicia listener.');
          return;
        }

        console.log(
          'Edificios: sesión detectada para',
          usuario.email,
          usuario.uid
        );

        // Solo llega aquí después de que Firebase Auth confirmó la sesión.
        this.cargarEdificios();
      },
      (error) => {
        console.error('Error al observar la autenticación:', error);
        this._edificios.set([]);
      }
    );
  }

  private cargarEdificios(): void {
    const db = this.firestore as any;
    const ref = collection(db, 'edificios');

    this.cancelarListenerEdificios = onSnapshot(
      ref,
      (snapshot: any) => {
        const edificios = snapshot.docs.map((d: any) => {
          const data = d.data();

          return {
            ...data,
            id: d.id,
            fechaCreacion: data['fechaCreacion']?.toDate
              ? data['fechaCreacion'].toDate()
              : data['fechaCreacion']
                ? new Date(data['fechaCreacion'])
                : null
          } as Edificio;
        });

        this._edificios.set(edificios);

        console.log('Edificios cargados:', edificios.length);
      },
      (error) => {
        console.error(
          'Error al cargar edificios:',
          error.code,
          error.message
        );
      }
    );
  }

  async crearEdificio(
    nombre: string,
    direccion: string,
    telefono: string
  ): Promise<string> {
    const db = this.firestore as any;

    const ref = await addDoc(collection(db, 'edificios'), {
      nombre,
      direccion,
      telefono,
      activo: true,
      fechaCreacion: new Date()
    });

    return ref.id;
  }

  async actualizarEdificio(
    id: string,
    datos: Partial<Edificio>
  ): Promise<void> {
    const db = this.firestore as any;
    const ref = doc(db, 'edificios', id);

    await updateDoc(ref, datos as any);
  }

  async toggleEdificio(
    id: string,
    activo: boolean
  ): Promise<void> {
    const db = this.firestore as any;
    const ref = doc(db, 'edificios', id);

    await updateDoc(ref, { activo });
  }

  async eliminarEdificio(id: string): Promise<void> {
    const db = this.firestore as any;
    const ref = doc(db, 'edificios', id);

    await deleteDoc(ref);
  }

  getNombreEdificio(id: string): string {
    const edificio = this._edificios().find((e) => e.id === id);

    return edificio ? edificio.nombre : 'Sin edificio';
  }
}