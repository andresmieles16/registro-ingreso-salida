import { Injectable, signal, computed } from '@angular/core';
import {
  getAuth, signInWithEmailAndPassword,
  signOut, createUserWithEmailAndPassword,
  onAuthStateChanged
} from 'firebase/auth';
import {
  collection, doc, getDoc, setDoc,
  getDocs, updateDoc, deleteDoc
} from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Usuario, RolUsuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private _usuarioActual      = signal<Usuario | null>(null);
  private _edificioSeleccionado = signal<string | null>(null);
  private auth                = getAuth();

  usuarioActual    = this._usuarioActual.asReadonly();
  isLoggedIn       = computed(() => this._usuarioActual() !== null);
  isAdmin          = computed(() =>
    this._usuarioActual()?.rol === 'admin' ||
    this._usuarioActual()?.rol === 'superadmin'
  );
  isSuperAdmin     = computed(() =>
    this._usuarioActual()?.rol === 'superadmin'
  );

  // edificioId activo — para superadmin y usuario normal usa edificioId
  // para admin usa el edificio seleccionado del array
  edificioId = computed(() => {
    const usuario = this._usuarioActual();
    if (!usuario) return null;
    if (usuario.rol === 'superadmin') return null;
    if (usuario.rol === 'admin') {
      // Si tiene seleccionado uno especifico usarlo
      // si no usar el primero del array
      return this._edificioSeleccionado() ||
             usuario.edificiosIds?.[0]    ||
             usuario.edificioId           ||
             null;
    }
    return usuario.edificioId;
  });

  // Edificios disponibles para el admin actual
  edificiosDisponibles = computed(() => {
    const usuario = this._usuarioActual();
    if (!usuario) return [];
    if (usuario.rol === 'superadmin') return [];
    if (usuario.rol === 'admin') {
      return usuario.edificiosIds || [];
    }
    return usuario.edificioId ? [usuario.edificioId] : [];
  });

  constructor(
    private firestore: Firestore,
    private router: Router
  ) {
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        const datos = await this.obtenerDatosUsuario(user.uid);
        this._usuarioActual.set(datos);
        // Restaurar edificio seleccionado del localStorage
        if (datos?.rol === 'admin') {
          const guardado = localStorage.getItem(`edificio_${user.uid}`);
          if (guardado && datos.edificiosIds?.includes(guardado)) {
            this._edificioSeleccionado.set(guardado);
          }
        }
        console.log('Usuario cargado:', datos);
      } else {
        this._usuarioActual.set(null);
        this._edificioSeleccionado.set(null);
      }
    });
  }

  // Cambiar edificio activo (solo admins)
  seleccionarEdificio(edificioId: string): void {
    const usuario = this._usuarioActual();
    if (!usuario || usuario.rol !== 'admin') return;
    if (!usuario.edificiosIds?.includes(edificioId)) return;
    this._edificioSeleccionado.set(edificioId);
    // Guardar en localStorage para persistir
    localStorage.setItem(`edificio_${usuario.uid}`, edificioId);
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const credencial = await signInWithEmailAndPassword(
        this.auth, email, password
      );
      const datos = await this.obtenerDatosUsuario(credencial.user.uid);
      if (!datos) throw new Error('Usuario no encontrado');
      if (!datos.activo) throw new Error('Usuario desactivado. Contacta al administrador');
      this._usuarioActual.set(datos);

      // Si es admin restaurar edificio seleccionado
      if (datos.rol === 'admin') {
        const guardado = localStorage.getItem(`edificio_${credencial.user.uid}`);
        if (guardado && datos.edificiosIds?.includes(guardado)) {
          this._edificioSeleccionado.set(guardado);
        } else if (datos.edificiosIds?.length) {
          this._edificioSeleccionado.set(datos.edificiosIds[0]);
        }
      }

      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      throw e;
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this._usuarioActual.set(null);
    this._edificioSeleccionado.set(null);
    this.router.navigate(['/login']);
  }

  async crearUsuario(
    email: string,
    password: string,
    nombre: string,
    rol: RolUsuario,
    edificioId: string | null,
    edificiosIds: string[] = []
  ): Promise<void> {
    try {
      const db           = this.firestore as any;
      const usuarioAdmin = this._usuarioActual();

      const credencial = await createUserWithEmailAndPassword(
        this.auth, email, password
      );

      const nuevoUsuario: Usuario = {
        uid: credencial.user.uid,
        email,
        nombre,
        rol,
        edificioId:   rol === 'admin' ? (edificiosIds[0] || null) : edificioId,
        edificiosIds: rol === 'admin' ? edificiosIds : [],
        activo: true,
        fechaCreacion: new Date(),
      };
      await setDoc(doc(db, 'usuarios', credencial.user.uid), nuevoUsuario);

      if (usuarioAdmin) {
        this._usuarioActual.set(usuarioAdmin);
      }
    } catch (e) {
      console.error('Error creando usuario:', e);
      throw e;
    }
  }

  async obtenerUsuarios(): Promise<Usuario[]> {
    try {
      const db       = this.firestore as any;
      const snapshot = await getDocs(collection(db, 'usuarios'));
      return snapshot.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          edificiosIds: data['edificiosIds'] || [],
          fechaCreacion: data['fechaCreacion']?.toDate
            ? data['fechaCreacion'].toDate()
            : new Date(data['fechaCreacion']),
        } as Usuario;
      });
    } catch (e) {
      return [];
    }
  }

  async toggleUsuario(uid: string, activo: boolean): Promise<void> {
    const db = this.firestore as any;
    await updateDoc(doc(db, 'usuarios', uid), { activo });
  }

  async cambiarRol(uid: string, rol: RolUsuario): Promise<void> {
    const db = this.firestore as any;
    await updateDoc(doc(db, 'usuarios', uid), { rol });
  }

  async asignarEdificio(uid: string, edificioId: string | null): Promise<void> {
    const db = this.firestore as any;
    await updateDoc(doc(db, 'usuarios', uid), { edificioId });
  }

  async asignarEdificios(uid: string, edificiosIds: string[]): Promise<void> {
    const db = this.firestore as any;
    await updateDoc(doc(db, 'usuarios', uid), {
      edificiosIds,
      edificioId: edificiosIds[0] || null,
    });
  }

  async eliminarUsuario(uid: string): Promise<void> {
    const db = this.firestore as any;
    await deleteDoc(doc(db, 'usuarios', uid));
  }

  private async obtenerDatosUsuario(uid: string): Promise<Usuario | null> {
    try {
      const db   = this.firestore as any;
      const snap = await getDoc(doc(db, 'usuarios', uid));
      if (snap.exists()) {
        const data = snap.data();
        return {
          ...data,
          edificiosIds: data['edificiosIds'] || [],
          fechaCreacion: data['fechaCreacion']?.toDate
            ? data['fechaCreacion'].toDate()
            : new Date(data['fechaCreacion']),
        } as Usuario;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}