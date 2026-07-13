/**
 * @fabrica/angular-auth
 *
 * Librería Angular para autenticación y control de acceso por roles.
 * Expone: AuthService, AuthGuard, RoleGuard, LoginComponent, RegistroComponent.
 *
 * Pendiente: compilar con ng-packagr para distribución como librería Angular real.
 * Por ahora, los componentes viven en frontend/src/app/ y se referencian aquí.
 */

export * from '../../../frontend/src/app/services/auth.service';
export * from '../../../frontend/src/app/guards/auth.guard';
export * from '../../../frontend/src/app/guards/role.guard';
