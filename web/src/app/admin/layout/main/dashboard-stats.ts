export interface DashboardRecentStudent {
  id: number;
  name: string;
  school: string;
  grade: string;
  status: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalGrades: number;
  totalSchools: number;
  recentStudents: DashboardRecentStudent[];
}
