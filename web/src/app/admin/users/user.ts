import { Role } from './role';
import { Status } from './status';
import { Title } from './title';

export interface User {
  id: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  studentId?: string | null;
  title?: Title | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  password?: string | null;
  role?: Role | null;
  roles?: Role[] | null;
  status?: Status | null;
  schoolIds?: number[];
  schoolNames?: string[];
  gradeId?: number | null;
  gradeName?: string | null;
}
