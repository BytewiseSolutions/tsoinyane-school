import { FeeStructure } from './fee-structure';

export interface FeeStructureFormSubmission {
  feeStructure: FeeStructure;
  selectedGradeIds: number[];
}
