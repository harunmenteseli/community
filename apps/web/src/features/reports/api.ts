import { http } from '../../lib/api';
import type { ReportReason, ReportTargetType } from './options';

export interface Report {
  id: string;
  targetType: ReportTargetType;
  reason: ReportReason;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface CreateReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  message?: string;
}

export const reportsApi = {
  create: (input: CreateReportInput) => http.post<{ report: Report }>('/api/reports', input),
  mine: () => http.get<{ reports: Report[] }>('/api/reports/mine'),
};
