export type RolUsuario = 'superadmin' | 'admin' | 'usuario';

export interface Usuario {
  uid: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  edificioId: string | null;       // para usuarios normales — 1 edificio
  edificiosIds: string[];          // para admins — multiples edificios
  activo: boolean;
  fechaCreacion: Date;
}