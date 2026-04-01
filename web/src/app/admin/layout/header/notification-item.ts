export interface NotificationItem {
  id?: number;
  type?: string;
  icon: string;
  title: string;
  message: string;
  timestamp: string;
  scheduledAt?: string | null;
  expiresAt?: string | null;
  schoolId?: number | null;
  schoolName?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
  audienceRoles?: string[] | null;
  readAt?: string | null;
  read?: boolean;
  editable?: boolean;
}
