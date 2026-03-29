import { Role } from './role';
import { Status } from './status';
import { Title } from './title';

export interface User {
  id: number;
  studentId?: string | null;
  title?: Title | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: Role | null;
  status?: Status | null;
  schoolIds?: number[];
  schoolNames?: string[];
}
