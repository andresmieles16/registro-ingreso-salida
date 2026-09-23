import { Routes } from '@angular/router';
import { authGuard, adminGuard, superAdminGuard, soloUsuarioGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard.component')
      .then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'registro-persona',
    loadComponent: () => import('./components/registro-persona.component')
      .then(m => m.RegistroPersonaComponent),
    canActivate: [authGuard, soloUsuarioGuard]
  },
  {
    path: 'registro-vehiculo',
    loadComponent: () => import('./components/registro-vehiculo.component')
      .then(m => m.RegistroVehiculoComponent),
    canActivate: [authGuard, soloUsuarioGuard]
  },
  {
    path: 'lista-activos',
    loadComponent: () => import('./components/lista-registros.component')
      .then(m => m.ListaRegistrosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'historial',
    loadComponent: () => import('./components/historial/historial.component')
      .then(m => m.HistorialComponent),
    canActivate: [authGuard]
  },
  {
    path: 'usuarios',
    loadComponent: () => import('./components/login/usuarios/usuarios.component')
      .then(m => m.UsuariosComponent),
    canActivate: [authGuard, superAdminGuard]
  },
  {
    path: 'edificios',
    loadComponent: () => import('./components/edificios/edificios.component')
      .then(m => m.EdificiosComponent),
    canActivate: [authGuard, superAdminGuard]
  },
  { path: '**', redirectTo: '/login' }
];
