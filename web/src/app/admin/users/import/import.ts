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
            rowNumber: index + 2,
            status: 'valid',
            firstName: row.firstName.trim(),
            lastName: row.lastName.trim(),
            cellphone: row.phone?.trim() || '',
            message: 'Ready to import.',
          });
        } catch (error) {
          this.validationResults.push({
            rowNumber: index + 2,
            status: 'invalid',
            firstName: row.firstName.trim(),
            lastName: row.lastName.trim(),
            cellphone: row.phone?.trim() || '',
            message: error instanceof Error ? error.message : 'Validation failed.',
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

    return rows.map(row => {
      const normalized = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), String(value ?? '').trim()])
      );

      return {
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

    if (!firstName || !lastName || !email || !password) {
      throw new Error('Each import row must include firstName, lastName, email, and password.');
    }

    const roles = this.parseRoles(row.roles);
    const isStudent = roles.includes(Role.STUDENT);
    const gradeId = isStudent ? this.resolveGradeId(row.grade, grades) : null;

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
    };
  }

  private parseRoles(value?: string): Role[] {
    if (!value?.trim()) {
      return [Role.STUDENT];
    }

    const roles = value
      .split(/[|,;]+/)
      .map(role => role.trim().toUpperCase().replace(/\s+/g, '_'))
      .filter(role => role.length > 0)
      .map(role => role as Role)
      .filter(role => Object.values(Role).includes(role));

    return roles.length ? Array.from(new Set(roles)) : [Role.STUDENT];
  }

  private parseStatus(value?: string): Status {
    const normalized = value?.trim().toUpperCase() as Status | undefined;
    return normalized && Object.values(Status).includes(normalized) ? normalized : Status.ACTIVE;
  }

  private parseTitle(value?: string): Title | null {
    const normalized = value?.trim() as Title | undefined;
    return normalized && Object.values(Title).includes(normalized) ? normalized : null;
  }

  private resolveGradeId(value: string | undefined, grades: Grade[]): number {
    const gradeName = value?.trim().toLowerCase();
    if (!gradeName) {
      throw new Error('Student import rows must include a grade column.');
    }

    const match = grades.find(grade => grade.name.trim().toLowerCase() === gradeName);
    if (!match?.id) {
      throw new Error(`Grade "${value}" was not found for the selected school.`);
    }

    return match.id;
  }

  private nullIfBlank(value?: string): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed ? trimmed : null;
  }
}
