export interface SchoolEvent {
  id?: number;
  schoolId?: number | null;
  schoolName?: string | null;
  name: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  location: string;
  eventType?: string | null;
  description?: string | null;
  status: string;
}
