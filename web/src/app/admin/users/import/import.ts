import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import * as XLSX from 'xlsx';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { Grade } from '../../grades/grade';
import { User } from '../user';
import { Role } from '../role';
import { Status } from '../status';
import { Title } from '../title';

interface ImportRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  title?: string;
  phone?: string;
  roles?: string;
  status?: string;
  grade?: string;
}

interface ValidationResult {
  rowNumber: number;
  status: 'valid' | 'invalid';
  firstName: string;
  lastName: string;
  cellphone: string;
  location: string;
  message: string;
}

@Component({
  selector: 'app-user-import',
  standalone: false,
  templateUrl: './import.html',
  styleUrl: './import.scss',
})
export class UserImportComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  selectedSchoolId: number | null = null;
  selectedSchoolName = 'No school selected';
  isImporting = false;
  message = '';
  errorMessage = '';
  importedCount = 0;
  failedCount = 0;
  selectedFileName = '';
  validationResults: ValidationResult[] = [];
  pendingUsers: User[] = [];

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
    return this.pendingUsers.length > 0 && this.invalidRowCount === 0 && !this.isImporting;
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
  }

  downloadTemplate(): void {
    const worksheet = XLSX.utils.json_to_sheet([
      {
        firstName: 'Mpho',
        lastName: 'Thabane',
        email: 'mpho.thabane@example.com',
        password: 'Temp123!',
        title: 'Mr',
        phone: '59123456',
        roles: 'STUDENT',
        status: 'ACTIVE',
        grade: 'Grade 8',
      },
      {
        firstName: 'Lerato',
        lastName: 'Mokoena',
        email: 'lerato.mokoena@example.com',
        password: 'Temp123!',
        title: 'Mrs',
        phone: '58000000',
        roles: 'TEACHER',
        status: 'ACTIVE',
        grade: '',
      },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    XLSX.writeFile(workbook, 'users-import-template.xlsx');

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
    this.importedCount = 0;
    this.failedCount = 0;
    this.selectedFileName = file.name;
    this.validationResults = [];
    this.pendingUsers = [];

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

      const grades = await firstValueFrom(this.backendService.get<Grade[]>('grade'));
      const schoolGrades = (grades ?? []).filter(grade => grade.schoolId === this.selectedSchoolId);

      rows.forEach((row, index) => {
        try {
          const payload = this.mapImportRowToUser(row, schoolGrades);
          this.pendingUsers.push(payload);
          this.validationResults.push({
            rowNumber: row.rowNumber,
            status: 'valid',
            firstName: row.firstName.trim(),
            lastName: row.lastName.trim(),
            cellphone: row.phone?.trim() || '',
            location: 'OK',
            message: 'Ready to import.',
          });
        } catch (error) {
          const details = this.normalizeValidationError(error);
          this.validationResults.push({
            rowNumber: row.rowNumber,
            status: 'invalid',
            firstName: row.firstName.trim(),
            lastName: row.lastName.trim(),
            cellphone: row.phone?.trim() || '',
            location: details.location,
            message: details.message,
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
    this.errorMessage = '';
    this.message = '';
    this.importedCount = 0;
    this.failedCount = 0;

    try {
      for (const payload of this.pendingUsers) {
        try {
          await firstValueFrom(this.backendService.post<User, User>('user', payload));
          this.importedCount += 1;
        } catch {
          this.failedCount += 1;
        }
      }

      this.message = this.failedCount
        ? `Import complete. ${this.importedCount} user(s) imported, ${this.failedCount} failed during save.`
        : `Import complete. ${this.importedCount} user(s) imported successfully.`;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Failed to confirm import.';
    } finally {
      this.isImporting = false;
    }
  }

  private async parseExcel(file: File): Promise<ImportRow[]> {
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
        Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), String(value ?? '').trim()])
      );

      return {
        rowNumber: index + 2,
        firstName: normalized['firstname'] || normalized['first_name'] || '',
        lastName: normalized['lastname'] || normalized['last_name'] || '',
        email: normalized['email'] || '',
        password: normalized['password'] || '',
        title: normalized['title'] || '',
        phone: normalized['phone'] || '',
        roles: normalized['roles'] || normalized['role'] || '',
        status: normalized['status'] || '',
        grade: normalized['grade'] || normalized['gradename'] || normalized['grade_name'] || '',
      };
    });
  }

  private mapImportRowToUser(row: ImportRow, grades: Grade[]): User {
    const firstName = row.firstName.trim();
    const lastName = row.lastName.trim();
    const email = row.email.trim().toLowerCase();
    const password = row.password.trim();

    const requiredErrors: string[] = [];
    const locations: string[] = [];

    if (!firstName) {
      requiredErrors.push('First Name is required');
      locations.push(this.cellRef('A', row.rowNumber));
    }
    if (!lastName) {
      requiredErrors.push('Last Name is required');
      locations.push(this.cellRef('B', row.rowNumber));
    }
    if (!email) {
      requiredErrors.push('Email is required');
      locations.push(this.cellRef('C', row.rowNumber));
    }
    if (!password) {
      requiredErrors.push('Password is required');
      locations.push(this.cellRef('D', row.rowNumber));
    }

    if (requiredErrors.length) {
      throw this.validationError(locations, requiredErrors.join('. '));
    }

    const roles = this.parseRoles(row.roles);
    const isStudent = roles.includes(Role.STUDENT);
    const isTeacher = roles.includes(Role.TEACHER);
    const gradeId = isStudent ? this.resolveStudentGradeId(row.grade, grades, row.rowNumber) : null;
    const teacherGradeIds = isTeacher ? this.resolveTeacherGradeIds(row.grade, grades, row.rowNumber) : [];

    return {
      id: 0,
      firstName,
      lastName,
      email,
      password,
      title: this.parseTitle(row.title),
      phone: this.nullIfBlank(row.phone),
      roles,
      status: this.parseStatus(row.status),
      schoolIds: this.selectedSchoolId ? [this.selectedSchoolId] : [],
      gradeId,
      teacherGradeIds,
    };
  }

  private parseRoles(value?: string): Role[] {
    if (!value?.trim()) {
      return [Role.STUDENT];
    }

    const rawRoles = value
      .split(/[|,;]+/)
      .map(role => role.trim().toUpperCase().replace(/\s+/g, '_'))
      .filter(role => role.length > 0);

    const invalidRoles = rawRoles.filter(role => !Object.values(Role).includes(role as Role));
    if (invalidRoles.length) {
      throw this.validationError(['G'], `Invalid role value(s): ${invalidRoles.join(', ')}`);
    }

    const roles = rawRoles.map(role => role as Role);

    return roles.length ? Array.from(new Set(roles)) : [Role.STUDENT];
  }

  private parseStatus(value?: string): Status {
    if (!value?.trim()) {
      return Status.ACTIVE;
    }

    const normalized = value.trim().toUpperCase() as Status;
    if (!Object.values(Status).includes(normalized)) {
      throw this.validationError(['H'], `Invalid status "${value}"`);
    }

    return normalized;
  }

  private parseTitle(value?: string): Title | null {
    if (!value?.trim()) {
      return null;
    }

    const normalized = value.trim() as Title;
    if (!Object.values(Title).includes(normalized)) {
      throw this.validationError(['E'], `Invalid title "${value}"`);
    }

    return normalized;
  }

  private resolveStudentGradeId(value: string | undefined, grades: Grade[], rowNumber: number): number {
    const gradeName = value?.trim().toLowerCase();
    if (!gradeName) {
      throw this.validationError([this.cellRef('I', rowNumber)], 'Student rows must include a grade');
    }

    const match = grades.find(grade => grade.name.trim().toLowerCase() === gradeName);
    if (!match?.id) {
      throw this.validationError([this.cellRef('I', rowNumber)], `Grade "${value}" was not found for the selected school`);
    }

    return match.id;
  }

  private resolveTeacherGradeIds(value: string | undefined, grades: Grade[], rowNumber: number): number[] {
    const rawValue = value?.trim() ?? '';
    if (!rawValue) {
      throw this.validationError([this.cellRef('I', rowNumber)], 'Teacher rows must include at least one grade');
    }

    const requestedGrades = rawValue
      .split(/[|,;]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);

    if (!requestedGrades.length) {
      throw this.validationError([this.cellRef('I', rowNumber)], 'Teacher rows must include at least one grade');
    }

    const resolvedGradeIds: number[] = [];
    const missingGrades: string[] = [];

    for (const requestedGrade of requestedGrades) {
      const match = grades.find(grade => grade.name.trim().toLowerCase() === requestedGrade.toLowerCase());
      if (!match?.id) {
        missingGrades.push(requestedGrade);
      } else {
        resolvedGradeIds.push(match.id);
      }
    }

    if (missingGrades.length) {
      throw this.validationError(
        [this.cellRef('I', rowNumber)],
        `Teacher grade(s) not found for the selected school: ${missingGrades.join(', ')}`
      );
    }

    return Array.from(new Set(resolvedGradeIds));
  }

  private validationError(locations: string[] | string, message: string): Error {
    const values = Array.isArray(locations) ? locations : [locations];
    return new Error(`${values.join(', ')}::${message}`);
  }

  private normalizeValidationError(error: unknown): { location: string; message: string } {
    if (!(error instanceof Error)) {
      return { location: '-', message: 'Validation failed.' };
    }

    const [location, message] = error.message.split('::', 2);
    if (!message) {
      return { location: '-', message: error.message };
    }

    return { location, message };
  }

  private cellRef(column: string, rowNumber: number): string {
    return `${column}${rowNumber}`;
  }

  private nullIfBlank(value?: string): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed ? trimmed : null;
  }
}
