export interface ActivityLog {
  id: number;
  createdAt: string;
  actorId?: number | null;
  actorName?: string | null;
  actorEmail?: string | null;
  action: string;
  module: string;
  targetId?: number | null;
  description: string;
  endpoint: string;
  httpMethod: string;
  statusCode: number;
  success: boolean;
  ipAddress?: string | null;
  schoolId?: number | null;
  schoolName?: string | null;
}
