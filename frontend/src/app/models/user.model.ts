export enum Role {
  ADMIN = 'ADMIN',
  DOCENTE = 'DOCENTE',
  ESTUDIANTE = 'ESTUDIANTE'
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Role;
  createdAt?: string;
}

export interface AuthPayload {
  token: string;
  usuario: Usuario;
}

export interface Materia {
  id: string;
  codigo: string;
  nombre: string;
  creditos: number;
  descripcion?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Inscripcion {
  id: string;
  estudiante: Pick<Usuario, 'id' | 'nombre' | 'email'>;
  materia: Pick<Materia, 'id' | 'codigo' | 'nombre' | 'creditos'>;
  fechaInscripcion: string;
}
