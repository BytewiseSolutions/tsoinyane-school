import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import * as XLSX from 'xlsx';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { SchoolSubject } from '../subject';
import { Status } from '../../users/status';

interface SubjectImportRow {
  rowNumber: number;
  code: string;
  name: string;
  status: string;
}

interface SubjectValidationResult {
  rowNumber: number;
  status: 'valid' | 'invalid';
  code: string;
  name: string;
  message: string;
}

@Component({
  selector: 'app-subjects-import',
  standalone: false,
  templateUrl: './import.html',
  styleUrl: './import.scss',
})
export class SubjectsImport implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  selectedSchoolId: number | null = null;
  selectedSchoolName = 'No school selected';
  isImporting = false;
  message = '';
  errorMessage = '';
  importedCount = 0;
  failedCount = 0;
  selectedFileName = '';
  validationResults: SubjectValidationResult[] = [];
  pendingSubjects: SchoolSubject[] = [];
  catalogSubjects: SchoolSubject[] = [];

  readonly stepItems = [
    'Download the import template.',
    'Upload completed file.',
    'Review validation results.',
    'Complete import.',
  ];
  readonly suggestedEnglishSubjects = [
    { code: 'ENG-001', name: 'English' },
    { code: 'MAT-001', name: 'Mathematics' },
    { code: 'SES-001', name: 'Sesotho' },
    { code: 'HIS-001', name: 'History' },
    { code: 'GEO-001', name: 'Geography' },
    { code: 'BUS-001', name: 'Business Education' },
    { code: 'ACC-001', name: 'Accounting' },
    { code: 'BIO-001', name: 'Biology' },
    { code: 'CHE-001', name: 'Chemistry' },
    { code: 'PHY-001', name: 'Physics' },
  ];

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService,
    private router: Router
  ) {}

  ngOnInit() {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.selectedSchoolName = school?.name ?? 'No school selected';
        this.resetImportState();
      });
  }

  ngOnDestroy() {
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
    return this.pendingSubjects.length > 0 && this.invalidRowCount === 0 && !this.isImporting;
  }

  goBack() {
    this.router.navigate(['/admin/subjects']);
  }

  downloadTemplate() {
    if (!this.selectedSchoolId) {
      this.errorMessage = 'Select the current school from the top header before downloading template.';
      return;
    }

    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Subject Code', 'Subject Name', 'Status'],
      ...this.suggestedEnglishSubjects.map(subject => [subject.code, subject.name, 'ACTIVE']),
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Subjects');

    XLSX.writeFile(workbook, 'subjects-import-template.xlsx');

    this.message = 'Template downloaded successfully.';
    this.errorMessage = '';
  }

  openFilePicker(fileInput: HTMLInputElement) {
    fileInput.value = '';
    fileInput.click();
  }

  async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.resetImportState();
    this.selectedFileName = file.name;

    if (!this.selectedSchoolId) {
      this.errorMessage = 'Select the current school from the top header before importing.';
      input.value = '';
      return;
    }

    this.isImporting = true;

    try {
      const rows = await this.parseExcel(file);

      if (!rows.length) {
        this.message = 'The selected import file is empty.';
        return;
      }

      const catalogSubjects = await firstValueFrom(
        this.backendService.get<SchoolSubject[]>('subject', { schoolId: this.selectedSchoolId })
      );

      this.catalogSubjects = (catalogSubjects ?? []).map(subject => ({
        ...subject,
        id: Number(subject.id ?? 0),
        subjectId: Number(subject.id ?? 0),
      }));

      const existingSubjectKeys = new Set(
        this.catalogSubjects
          .map(subject => this.buildSubjectKey(subject.code))
          .filter(key => !!key)
      );
      const fileSubjectKeys = new Set<string>();

      rows.forEach(row => {
        try {
          const payload = this.mapImportRowToSubject(row, existingSubjectKeys, fileSubjectKeys);
          this.pendingSubjects.push(payload);
          this.validationResults.push({
            rowNumber: row.rowNumber,
            status: 'valid',
            code: row.code.trim(),
            name: row.name.trim(),
            message: 'Ready to import.',
          });
        } catch (error) {
          this.validationResults.push({
            rowNumber: row.rowNumber,
            status: 'invalid',
            code: row.code.trim(),
            name: row.name.trim(),
            message: error instanceof Error ? error.message : 'Invalid row data.',
          });
        }
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
    this.message = '';
    this.errorMessage = '';
    this.importedCount = 0;
    this.failedCount = 0;

    try {
      for (const payload of this.pendingSubjects) {
        try {
          await this.saveSubject(payload);
          this.importedCount += 1;
        } catch {
          this.failedCount += 1;
        }
      }

      this.message = this.failedCount
        ? `Import complete. ${this.importedCount} subject(s) imported, ${this.failedCount} failed during save.`
        : `Import complete. ${this.importedCount} subject(s) imported successfully.`;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Failed to confirm import.';
    } finally {
      this.isImporting = false;
    }
  }

  private async parseExcel(file: File): Promise<SubjectImportRow[]> {
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

    return rows.map((row, index) => {
      const normalized = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          this.normalizeHeader(key),
          String(value ?? '').trim(),
        ])
      );

      return {
        rowNumber: index + 2,
        code: this.readColumn(normalized, ['subject code', 'subjectcode', 'code']),
        name: this.readColumn(normalized, ['subject name', 'subjectname', 'name']),
        status: this.readColumn(normalized, ['status']),
      };
    });
  }

  private mapImportRowToSubject(
    row: SubjectImportRow,
    existingSubjectKeys: Set<string>,
    fileSubjectKeys: Set<string>
  ): SchoolSubject {
    const code = row.code.trim();
    const name = row.name.trim();
    const subjectKey = this.buildSubjectKey(code);

    if (!code) {
      throw new Error('Subject code is required.');
    }

    if (!name) {
      throw new Error('Subject name is required.');
    }

    if (existingSubjectKeys.has(subjectKey)) {
      throw new Error('Subject code already exists for the selected school.');
    }

    if (fileSubjectKeys.has(subjectKey)) {
      throw new Error('Duplicate subject code found in the import file.');
    }

    const status = this.parseStatus(row.status);
    if (status === null) {
      throw new Error('Status must be ACTIVE or INACTIVE.');
    }

    fileSubjectKeys.add(subjectKey);

    return {
      code,
      name,
      subjectId: null,
      assignmentId: null,
      schoolId: this.selectedSchoolId,
      schoolName: this.selectedSchoolName,
      gradeId: null,
      gradeName: null,
      teacherId: null,
      teacherName: null,
      status,
    };
  }

  private buildSubjectKey(code: string): string {
    return this.normalizeValue(code);
  }

  private async saveSubject(subject: SchoolSubject): Promise<void> {
    const existingCatalog = this.catalogSubjects.find(item =>
      this.normalizeValue(item.code) === this.normalizeValue(subject.code)
    );

    if (existingCatalog) {
      return;
    }

    const catalogSubject = await firstValueFrom(this.backendService.post<SchoolSubject, SchoolSubject>('subject', {
      code: subject.code,
      name: subject.name,
      schoolId: this.selectedSchoolId,
      schoolName: this.selectedSchoolName,
      subjectId: null,
      assignmentId: null,
      gradeId: null,
      gradeName: null,
      teacherId: null,
      teacherName: null,
      assignmentCount: null,
      studentCount: null,
      status: subject.status,
    }));

    this.catalogSubjects = [
      ...this.catalogSubjects,
      {
        ...catalogSubject,
        id: Number(catalogSubject.id ?? 0),
        subjectId: Number(catalogSubject.id ?? 0),
      },
    ];
  }

  private parseStatus(rawStatus: string): Status | null {
    const normalizedStatus = this.normalizeValue(rawStatus);

    if (!normalizedStatus) {
      return Status.ACTIVE;
    }

    if (normalizedStatus === Status.ACTIVE.toLowerCase()) {
      return Status.ACTIVE;
    }

    if (normalizedStatus === Status.INACTIVE.toLowerCase()) {
      return Status.INACTIVE;
    }

    return null;
  }

  private readColumn(
    row: Record<string, string>,
    columnNames: string[]
  ): string {
    for (const columnName of columnNames) {
      if (columnName in row) {
        return row[columnName];
      }
    }

    return '';
  }

  private normalizeHeader(value: string): string {
    return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  }

  private normalizeValue(value: string | null | undefined): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private resetImportState() {
    this.isImporting = false;
    this.message = '';
    this.errorMessage = '';
    this.importedCount = 0;
    this.failedCount = 0;
    this.selectedFileName = '';
    this.validationResults = [];
    this.pendingSubjects = [];
    this.catalogSubjects = [];
  }
}
