import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../../util/backend.service';
import { SchoolSubject } from '../subject';
import { TimetableEntry } from '../timetable-entry';

interface TimetableImportRow {
  rowNumber: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

interface TimetableValidationResult {
  rowNumber: number;
  status: 'valid' | 'invalid';
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  message: string;
}

@Component({
  selector: 'app-timetable-import',
  standalone: false,
  templateUrl: './timetable-import.html',
  styleUrl: './timetable-import.scss',
})
export class TimetableImport implements OnInit {
  readonly dayOfWeekOptions = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];
  readonly stepItems = [
    'Download the import template.',
    'Upload completed file.',
    'Review validation results.',
    'Complete import.',
  ];

  subjectId: number | null = null;
  subject: SchoolSubject | null = null;
  existingTimetables: TimetableEntry[] = [];
  isLoading = true;
  isImporting = false;
  selectedFileName = '';
  message = '';
  errorMessage = '';
  importedCount = 0;
  failedCount = 0;
  validationResults: TimetableValidationResult[] = [];
  pendingTimetables: TimetableEntry[] = [];
  saveErrors: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService
  ) {}

  ngOnInit(): void {
    const subjectId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(subjectId) || subjectId <= 0) {
      this.errorMessage = 'Subject not found.';
      this.isLoading = false;
      return;
    }

    this.subjectId = subjectId;
    this.loadContext(subjectId);
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
    return this.pendingTimetables.length > 0 && this.invalidRowCount === 0 && !this.isImporting;
  }

  goBack(): void {
    if (this.subjectId) {
      this.router.navigate(['/admin/subjects', this.subjectId]);
      return;
    }

    this.router.navigate(['/admin/subjects']);
  }

  downloadTemplate(): void {
    const worksheet = XLSX.utils.json_to_sheet([
      {
        'Day of Week': 'MONDAY',
        'Start Time': '08:00',
        'End Time': '09:00',
      },
      {
        'Day of Week': 'WEDNESDAY',
        'Start Time': '10:00',
        'End Time': '11:00',
      },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Timetable');
    XLSX.writeFile(
      workbook,
      `${(this.subject?.code || this.subject?.name || 'subject').replace(/\s+/g, '_')}-timetable-import-template.xlsx`
    );

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

    this.resetImportState();
    this.selectedFileName = file.name;

    if (!this.subjectId || !this.subject) {
      this.errorMessage = 'Subject not found.';
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

      const existingKeys = new Set(
        this.existingTimetables.map(entry => this.toSlotKey(entry.dayOfWeek, entry.startTime, entry.endTime))
      );
      const fileKeys = new Set<string>();

      rows.forEach(row => {
        try {
          const payload = this.mapImportRowToTimetable(row, existingKeys, fileKeys);
          this.pendingTimetables.push(payload);
          this.validationResults.push({
            rowNumber: row.rowNumber,
            status: 'valid',
            dayOfWeek: payload.dayOfWeek,
            startTime: payload.startTime,
            endTime: payload.endTime,
            message: 'Ready to import.',
          });
        } catch (error) {
          this.validationResults.push({
            rowNumber: row.rowNumber,
            status: 'invalid',
            dayOfWeek: row.dayOfWeek.trim(),
            startTime: row.startTime.trim(),
            endTime: row.endTime.trim(),
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
    this.saveErrors = [];

    try {
      for (const payload of this.pendingTimetables) {
        try {
          const saved = await firstValueFrom(this.backendService.post<TimetableEntry, TimetableEntry>('timetable', payload));
          this.importedCount += 1;
          this.existingTimetables = [...this.existingTimetables, this.normalizeEntry(saved)];
        } catch (error) {
          this.failedCount += 1;
          this.saveErrors.push(this.getBackendError(error));
        }
      }

      this.message = this.failedCount
        ? `Import complete. ${this.importedCount} timetable entr${this.importedCount === 1 ? 'y' : 'ies'} imported, ${this.failedCount} failed during save.`
        : `Import complete. ${this.importedCount} timetable entr${this.importedCount === 1 ? 'y' : 'ies'} imported successfully.`;
    } finally {
      this.isImporting = false;
    }
  }

  getDayLabel(dayOfWeek: string | null | undefined): string {
    return (dayOfWeek ?? '')
      .toLowerCase()
      .replace(/^\w/, value => value.toUpperCase());
  }

  formatTimeRange(entry: TimetableEntry): string {
    return `${entry.startTime} - ${entry.endTime}`;
  }

  private async loadContext(subjectId: number): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const [subject, timetables] = await Promise.all([
        firstValueFrom(this.backendService.get<SchoolSubject>(`subject/${subjectId}`)),
        firstValueFrom(this.backendService.get<TimetableEntry[]>('timetable', { subjectId })),
      ]);

      this.subject = subject;
      this.existingTimetables = (timetables ?? []).map(entry => this.normalizeEntry(entry));
    } catch (error) {
      this.errorMessage = this.getBackendError(error) || 'Failed to load timetable import context.';
    } finally {
      this.isLoading = false;
    }
  }

  private async parseExcel(file: File): Promise<TimetableImportRow[]> {
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
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false });

    return rows.map((row, index) => {
      const normalized = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          this.normalizeHeader(key),
          String(value ?? '').trim(),
        ])
      );

      return {
        rowNumber: index + 2,
        dayOfWeek: this.readColumn(normalized, ['day of week', 'dayofweek', 'day']),
        startTime: this.readColumn(normalized, ['start time', 'starttime']),
        endTime: this.readColumn(normalized, ['end time', 'endtime']),
      };
    });
  }

  private mapImportRowToTimetable(
    row: TimetableImportRow,
    existingKeys: Set<string>,
    fileKeys: Set<string>
  ): TimetableEntry {
    const dayOfWeek = row.dayOfWeek.trim().toUpperCase();
    const startTime = this.normalizeTimeValue(row.startTime);
    const endTime = this.normalizeTimeValue(row.endTime);

    if (!this.dayOfWeekOptions.includes(dayOfWeek)) {
      throw new Error('Day of Week must be one of MONDAY to SUNDAY.');
    }

    if (!startTime) {
      throw new Error('Start Time is required.');
    }

    if (!endTime) {
      throw new Error('End Time is required.');
    }

    if (startTime >= endTime) {
      throw new Error('Start Time must be before End Time.');
    }

    const slotKey = this.toSlotKey(dayOfWeek, startTime, endTime);
    if (existingKeys.has(slotKey)) {
      throw new Error('This timetable slot already exists for the subject.');
    }

    if (fileKeys.has(slotKey)) {
      throw new Error('Duplicate timetable slot found in the import file.');
    }

    fileKeys.add(slotKey);

    return {
      dayOfWeek,
      startTime,
      endTime,
      subjectId: this.subjectId,
    };
  }

  private normalizeTimeValue(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    const normalized = trimmed.replace('.', ':');
    const match = normalized.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) {
      throw new Error('Time must be in HH:mm format.');
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error('Time must be a valid 24-hour time.');
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private normalizeEntry(entry: TimetableEntry): TimetableEntry {
    return {
      ...entry,
      startTime: entry.startTime?.slice(0, 5) ?? '',
      endTime: entry.endTime?.slice(0, 5) ?? '',
      studentIds: entry.studentIds ?? [],
      studentCount: entry.studentCount ?? entry.studentIds?.length ?? 0,
      lessonCount: entry.lessonCount ?? 0,
    };
  }

  private normalizeHeader(value: string): string {
    return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private readColumn(row: Record<string, string>, keys: string[]): string {
    for (const key of keys) {
      if (row[key] != null) {
        return row[key];
      }
    }

    return '';
  }

  private toSlotKey(dayOfWeek: string, startTime: string, endTime: string): string {
    return `${dayOfWeek}|${startTime}|${endTime}`;
  }

  private getBackendError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.message || error.message || 'Request failed.';
    }

    return error instanceof Error ? error.message : 'Request failed.';
  }

  private resetImportState(): void {
    this.message = '';
    this.errorMessage = '';
    this.importedCount = 0;
    this.failedCount = 0;
    this.selectedFileName = '';
    this.validationResults = [];
    this.pendingTimetables = [];
    this.saveErrors = [];
  }
}
