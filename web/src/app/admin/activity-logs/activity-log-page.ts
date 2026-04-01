import { ActivityLog } from './activity-log';

export interface ActivityLogPage {
  logs: ActivityLog[];
  totalLogs: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  actionOptions: string[];
  moduleOptions: string[];
}
