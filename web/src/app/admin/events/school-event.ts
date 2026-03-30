export interface SchoolEvent {
  id?: number;
  schoolId?: number | null;
  schoolName?: string | null;
  name: string;
  date: string;
  location: string;
  status: string;
}
