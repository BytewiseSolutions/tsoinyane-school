import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import * as XLSX from 'xlsx';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { Grade } from '../grade';

interface GradeImportRow {
  name: string;
}

interface GradeValidationResult {
  rowNumber: number;
  status: 'valid' | 'invalid';
  name: string;
  message: string;
}

@Component({
  selector: 'app-grade-import',
  standalone: false,
  templateUrl: './import.html',
  styleUrl: './import.scss',
})
export class GradeImportComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  selectedSchoolId: number | null = null;
  selectedSchoolName = 'No school selected';
  isImporting = false;
  message = '';
  errorMessage = '';
  selectedFileName = '';
  validationResults: GradeValidationResult[] = [];
  pendingGrades: Grade[] = [];

  readonly stepItems = [
    'Download the import template.',
    'Upload completed file.',
    'Review validation results.',
    'Complete import.',
  ];

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.selectedSchoolName = school?.name ?? 'No school selected';
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get validRowCount(): number {
    return this.validationResults.filter(result => result.status === 'valid').length;
  }

  get invalidRowCount(): number {
    return this.validationResults.filter(result => result.status === 'invalid').length;
  }

  get totalRowCount(): number {
    return this.validationResults.length;
  }

  get canConfirmImport(): boolean {
    return this.pendingGrades.length > 0 && this.invalidRowCount === 0 && !this.isImporting;
  }

  goBack(): void {
    this.router.navigate(['/admin/grades']);
  }

  downloadTemplate(): void {
    const worksheet = XLSX.utils.json_to_sheet([{ name: 'Grade 1' }, { name: 'Grade 2' }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grades');
    XLSX.writeFile(workbook, 'grades-import-template.xlsx');

    this.message = 'Template downloaded successfully.';
    this.errorMessage = '';
  }

  openFilePicker(fileInput: HTMLInputElement): void {
    fileInput.value = '';
    fileInput.click();
  }

  async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.errorMessage = '';
    this.message = '';
    this.selectedFileName = file.name;
    this.validationResults = [];
    this.pendingGrades = [];

    if (!this.selectedSchoolId) {
      this.errorMessage = 'Select the current school from the top header before importing.';
      input.value = '';
      return;
    }

    this.isImporting = true;

    try {
      const rows = await this.parseExcel(file);
      const existingGrades = await firstValueFrom(this.backendService.get<Grade[]>('grade'));
      const schoolGrades = (existingGrades ?? []).filter(grade => grade.schoolId === this.selectedSchoolId);
      const existingNames = new Set(schoolGrades.map(grade => grade.name.trim().toLowerCase()));
      const fileNames = new Set<string>();

      rows.forEach((row, index) => {
        const name = row.name.trim();

        if (!name) {
          this.validationResults.push({
            rowNumber: index + 2,
            status: 'invalid',
            name: '',
            message: 'Grade name is required.',
          });
          return;
        }

        const normalized = name.toLowerCase();
        if (existingNames.has(normalized)) {
          this.validationResults.push({
            rowNumber: index + 2,
            status: 'invalid',
            name,
            message: 'Grade already exists for the selected school.',
          });
          return;
        }

        if (fileNames.has(normalized)) {
          this.validationResults.push({
            rowNumber: index + 2,
            status: 'invalid',
            name,
            message: 'Duplicate grade found in the import file.',
          });
          return;
        }

        fileNames.add(normalized);
        const payload: Grade = {
          name,
          schoolId: this.selectedSchoolId,
        };
        this.pendingGrades.push(payload);
        this.validationResults.push({
          rowNumber: index + 2,
          status: 'valid',
          name,
          message: 'Ready to import.',
        });
      });
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Failed to import file.';
    } finally {
      this.isImporting = false;
      input.value = '';
    }
  }

  async confirmImport(): Promise<void> {
    if (!this.canConfirmImport) {
      return;
    }

    this.isImporting = true;
    this.errorMessage = '';
    this.message = '';

    let importedCount = 0;
    let failedCount = 0;

    try {
      for (const payload of this.pendingGrades) {
        try {
          await firstValueFrom(this.backendService.post<Grade, Grade>('grade', payload));
          importedCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      this.message = failedCount
        ? `Import complete. ${importedCount} grade(s) imported, ${failedCount} failed during save.`
        : `Import complete. ${importedCount} grade(s) imported successfully.`;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Failed to confirm import.';
    } finally {
      this.isImporting = false;
    }
  }

  private async parseExcel(file: File): Promise<GradeImportRow[]> {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) {
      throw new Error('Unsupported file type. Please upload an Excel file.');
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return [];
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

    return rows.map(row => {
      const normalized = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), String(value ?? '').trim()])
      );

      return {
        name: normalized['name'] || normalized['grade'] || '',
      };
    });
  }
}
