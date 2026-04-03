import { GradeOutstandingSummary } from './grade-outstanding-summary';
import { OutstandingLearner } from './outstanding-learner';

export interface OutstandingSummary {
  learners: OutstandingLearner[];
  gradeSummary: GradeOutstandingSummary[];
}
