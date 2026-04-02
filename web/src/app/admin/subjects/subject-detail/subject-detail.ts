import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { BackendService } from '../../../util/backend.service';
import { SchoolSubject } from '../subject';
import { TimetableEntry } from '../timetable-entry';
import { Status } from '../../users/status';

interface StudentOption {
  id: number;
  displayName: string;
  email: string | null;
  phone: string | null;
  studentId: string | null;
  gradeId?: number | null;
}

const SELECT_ALL_ID = -1;

@Component({
  selector: 'app-subject-detail',
  standalone: false,
  templateUrl: './subject-detail.html',
  styleUrl: './subject-detail.scss',
})
export class SubjectDetail implements OnInit {
  readonly pageSizeOptions = [10, 25, 50];
  readonly dayOfWeekOptions = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];
  subject: SchoolSubject | null = null;
  isLoading = true;
  errorMessage = '';
  activeTab: 'students' | 'timetable' = 'students';

  availableStudents: StudentOption[] = [];
  selectableStudents: StudentOption[] = [];
  assignedStudents: StudentOption[] = [];
  selectedStudents: StudentOption[] = [];
  selectedAssignedStudentIds: number[] = [];
  studentsError = '';
  assignedStudentsSortBy: 'firstName' | 'lastName' = 'firstName';
  assignedStudentsSortDirection: 'asc' | 'desc' = 'asc';
  pageSize = 10;
  currentPage = 1;

  transferringStudents: StudentOption[] = [];
  removingStudents: StudentOption[] = [];
  targetSubjectId: number | null = null;
  availableSubjects: SchoolSubject[] = [];
  isTransferring = false;
  timetables: TimetableEntry[] = [];
  isLoadingTimetables = false;
  timetableError = '';
  showTimetableForm = false;
  showDeleteTimetableDialog = false;
  isSavingTimetable = false;
  timetableToDelete: TimetableEntry | null = null;
  editingTimetable: TimetableEntry | null = null;
  timetableForm: TimetableEntry = this.createEmptyTimetableForm();
  timetableSearchTerm = '';
  selectedTimetableDayFilter: string | 'ALL' = 'ALL';
  selectedTimetableSort = 'day-asc';
  timetablePageSize = 10;
  timetableCurrentPage = 1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(id) || id <= 0) {
      this.errorMessage = 'Subject not found.';
      this.isLoading = false;
      return;
    }

    this.backendService.get<SchoolSubject>(`subject/${id}`).subscribe({
      next: (subject) => {
        this.subject = subject;
        this.loadStudents(subject.schoolId, subject.gradeId);
        this.loadAssignedStudents(id);
        this.loadTimetables(id);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load subject details.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  onItemAdded(item: StudentOption) {
    if (item.id === SELECT_ALL_ID) {
      this.selectedStudents = [...this.selectableStudents];
    }
  }

  onItemRemoved(item: StudentOption) {
    if (item.id === SELECT_ALL_ID) {
      this.selectedStudents = [];
    } else {
      this.selectedStudents = this.selectedStudents.filter(s => s.id !== SELECT_ALL_ID);
    }
  }

  isAlreadyAssigned(item: StudentOption): boolean {
    return item.id !== SELECT_ALL_ID && this.assignedStudents.some(s => s.id === item.id);
  }

  assignStudents() {
    const toAdd = this.selectedStudents.filter(
      s => s.id !== SELECT_ALL_ID && !this.assignedStudents.some(a => a.id === s.id)
    );
    this.assignedStudents = [...this.assignedStudents, ...toAdd];
    this.syncSubjectStudentCount();
    this.selectedStudents = [];
    this.saveAssignedStudents();
  }

  get hasSelectedAssignedStudents(): boolean {
    return this.selectedAssignedStudentIds.length > 0;
  }

  get selectedAssignedStudentsCount(): number {
    return this.selectedAssignedStudentIds.length;
  }

  get sortedAssignedStudents(): StudentOption[] {
    return [...this.assignedStudents].sort((left, right) => {
      const leftName = this.getSortValue(left, this.assignedStudentsSortBy);
      const rightName = this.getSortValue(right, this.assignedStudentsSortBy);
      const result = leftName.localeCompare(rightName, undefined, { sensitivity: 'base' });

      return this.assignedStudentsSortDirection === 'desc' ? result * -1 : result;
    });
  }

  get paginatedAssignedStudents(): StudentOption[] {
    const start = (this.safeCurrentPage - 1) * this.pageSize;
    return this.sortedAssignedStudents.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.assignedStudents.length / this.pageSize));
  }

  get safeCurrentPage(): number {
    return Math.min(this.currentPage, this.totalPages);
  }

  get pageStart(): number {
    if (!this.assignedStudents.length) {
      return 0;
    }

    return (this.safeCurrentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.safeCurrentPage * this.pageSize, this.assignedStudents.length);
  }

  get filteredTimetables(): TimetableEntry[] {
    const query = this.timetableSearchTerm.trim().toLowerCase();

    return [...this.timetables]
      .filter(entry => this.matchesTimetableSearch(entry, query))
      .filter(entry => this.selectedTimetableDayFilter === 'ALL' || entry.dayOfWeek === this.selectedTimetableDayFilter)
      .sort((left, right) => this.compareTimetables(left, right));
  }

  get paginatedTimetables(): TimetableEntry[] {
    const start = (this.safeTimetableCurrentPage - 1) * this.timetablePageSize;
    return this.filteredTimetables.slice(start, start + this.timetablePageSize);
  }

  get totalTimetables(): number {
    return this.timetables.length;
  }

  get totalTimetableLessons(): number {
    return this.timetables.reduce((total, entry) => total + (entry.lessonCount ?? 0), 0);
  }

  get totalTimetableWeeklyHours(): string {
    const totalMinutes = this.timetables.reduce((sum, entry) => sum + this.getTimetableDurationMinutes(entry), 0);
    if (!totalMinutes) {
      return '0 hrs';
    }

    const hours = totalMinutes / 60;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hrs`;
  }

  get earliestTimetableStart(): string {
    if (!this.timetables.length) {
      return 'N/A';
    }

    return [...this.timetables]
      .map(entry => this.normalizeTime(entry.startTime))
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right))[0] || 'N/A';
  }

  get timetableTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTimetables.length / this.timetablePageSize));
  }

  get safeTimetableCurrentPage(): number {
    return Math.min(this.timetableCurrentPage, this.timetableTotalPages);
  }

  get timetablePageStart(): number {
    if (!this.filteredTimetables.length) {
      return 0;
    }

    return (this.safeTimetableCurrentPage - 1) * this.timetablePageSize + 1;
  }

  get timetablePageEnd(): number {
    return Math.min(this.safeTimetableCurrentPage * this.timetablePageSize, this.filteredTimetables.length);
  }

  get allAssignedStudentsSelected(): boolean {
    return this.assignedStudents.length > 0
      && this.selectedAssignedStudentIds.length === this.assignedStudents.length;
  }

  get partiallySelectedAssignedStudents(): boolean {
    return this.selectedAssignedStudentIds.length > 0
      && this.selectedAssignedStudentIds.length < this.assignedStudents.length;
  }

  get removingStudent(): StudentOption | null {
    return this.removingStudents[0] ?? null;
  }

  get transferringStudent(): StudentOption | null {
    return this.transferringStudents[0] ?? null;
  }

  isAssignedStudentSelected(studentId: number): boolean {
    return this.selectedAssignedStudentIds.includes(studentId);
  }

  toggleAssignedStudent(studentId: number, checked: boolean) {
    if (checked) {
      if (!this.selectedAssignedStudentIds.includes(studentId)) {
        this.selectedAssignedStudentIds = [...this.selectedAssignedStudentIds, studentId];
      }
      return;
    }

    this.selectedAssignedStudentIds = this.selectedAssignedStudentIds.filter(id => id !== studentId);
  }

  toggleAllAssignedStudents(checked: boolean) {
    this.selectedAssignedStudentIds = checked ? this.assignedStudents.map(student => student.id) : [];
  }

  confirmRemove(student?: StudentOption) {
    this.removingStudents = student ? [student] : this.getSelectedAssignedStudents();
  }

  cancelRemove() {
    this.removingStudents = [];
  }

  removeStudents() {
    if (!this.removingStudents.length) {
      return;
    }

    this.removeAssignedStudents(this.removingStudents.map(student => student.id));
    this.removingStudents = [];
    this.saveAssignedStudents();
  }

  transferStudent(student?: StudentOption) {
    this.transferringStudents = student ? [student] : this.getSelectedAssignedStudents();

    if (!this.transferringStudents.length) {
      return;
    }

    this.targetSubjectId = null;
    this.studentsError = '';

    if (!this.availableSubjects.length && this.subject?.schoolId) {
      this.backendService.get<SchoolSubject[]>('subject', { schoolId: this.subject.schoolId }).subscribe({
        next: (subjects) => {
          this.availableSubjects = (subjects ?? []).filter(s =>
            s.id !== this.subject!.id
            && s.gradeId === this.subject!.gradeId
          );
          this.studentsError = this.availableSubjects.length
            ? ''
            : `No other subjects are available for ${this.subject?.gradeName || 'this grade'}.`;
        },
      });
      return;
    }

    this.availableSubjects = this.availableSubjects.filter(s => s.gradeId === this.subject?.gradeId);
    this.studentsError = this.availableSubjects.length
      ? ''
      : `No other subjects are available for ${this.subject?.gradeName || 'this grade'}.`;
  }

  cancelTransfer() {
    this.transferringStudents = [];
    this.targetSubjectId = null;
    this.studentsError = '';
  }

  confirmTransfer() {
    if (!this.transferringStudents.length || !this.targetSubjectId || this.isTransferring) return;

    this.isTransferring = true;
    const studentsToTransfer = [...this.transferringStudents];
    const targetId = this.targetSubjectId;

    this.backendService.get<any[]>(`subject/${targetId}/students`).subscribe({
      next: (existing) => {
        const existingIds = (existing ?? []).map((s: any) => s.id);
        const alreadyAssigned = studentsToTransfer.filter(student => existingIds.includes(student.id));
        if (alreadyAssigned.length) {
          this.studentsError = alreadyAssigned.length === 1
            ? `${alreadyAssigned[0].displayName} is already assigned to the target subject.`
            : `${alreadyAssigned.length} selected students are already assigned to the target subject.`;
          this.isTransferring = false;
          return;
        }

        const newIds = [...existingIds, ...studentsToTransfer.map(student => student.id)];
        this.backendService.put(`subject/${targetId}/students`, newIds).subscribe({
          next: () => {
            this.removeAssignedStudents(studentsToTransfer.map(student => student.id));
            this.saveAssignedStudents();
            this.transferringStudents = [];
            this.targetSubjectId = null;
            this.studentsError = '';
            this.isTransferring = false;
          },
          error: () => {
            this.studentsError = this.transferringStudents.length > 1
              ? 'Failed to transfer selected students.'
              : 'Failed to transfer student.';
            this.isTransferring = false;
          },
        });
      },
      error: () => {
        this.studentsError = this.transferringStudents.length > 1
          ? 'Failed to transfer selected students.'
          : 'Failed to transfer student.';
        this.isTransferring = false;
      },
    });
  }

  getStatusLabel(status: Status | null | undefined): string {
    return status === Status.INACTIVE ? 'Inactive' : 'Active';
  }

  goBack() {
    this.router.navigate(['/admin/subjects']);
  }

  onPageSizeChanged(): void {
    this.currentPage = 1;
  }

  onTimetableFiltersChanged(): void {
    this.timetableCurrentPage = 1;
  }

  onTimetablePageSizeChanged(): void {
    this.timetableCurrentPage = 1;
  }

  goToPreviousPage(): void {
    if (this.safeCurrentPage > 1) {
      this.currentPage = this.safeCurrentPage - 1;
    }
  }

  goToNextPage(): void {
    if (this.safeCurrentPage < this.totalPages) {
      this.currentPage = this.safeCurrentPage + 1;
    }
  }

  goToPreviousTimetablePage(): void {
    if (this.safeTimetableCurrentPage > 1) {
      this.timetableCurrentPage = this.safeTimetableCurrentPage - 1;
    }
  }

  goToNextTimetablePage(): void {
    if (this.safeTimetableCurrentPage < this.timetableTotalPages) {
      this.timetableCurrentPage = this.safeTimetableCurrentPage + 1;
    }
  }

  openTimetableForm(entry?: TimetableEntry): void {
    this.timetableError = '';
    this.editingTimetable = entry ? { ...entry, studentIds: [...(entry.studentIds ?? [])] } : null;
    this.timetableForm = entry
      ? {
          ...entry,
          startTime: this.normalizeTime(entry.startTime),
          endTime: this.normalizeTime(entry.endTime),
          studentIds: [...(entry.studentIds ?? [])],
        }
      : this.createEmptyTimetableForm();
    this.showTimetableForm = true;
  }

  closeTimetableForm(): void {
    this.showTimetableForm = false;
    this.editingTimetable = null;
    this.timetableForm = this.createEmptyTimetableForm();
  }

  saveTimetable(): void {
    if (!this.subject?.id || this.isSavingTimetable) {
      return;
    }

    if (!this.timetableForm.dayOfWeek || !this.timetableForm.startTime || !this.timetableForm.endTime) {
      this.timetableError = 'Day, start time, and end time are required.';
      return;
    }

    if (this.timetableForm.startTime >= this.timetableForm.endTime) {
      this.timetableError = 'Start time must be before end time.';
      return;
    }

    this.isSavingTimetable = true;
    this.timetableError = '';

    const payload: TimetableEntry = {
      ...this.timetableForm,
      subjectId: this.subject.id,
    };

    const request$ = this.editingTimetable?.id
      ? this.backendService.put<TimetableEntry, TimetableEntry>(`timetable/${this.editingTimetable.id}`, payload)
      : this.backendService.post<TimetableEntry, TimetableEntry>('timetable', payload);

    request$.subscribe({
      next: (savedTimetable) => {
        const normalized = this.mapTimetable(savedTimetable);
        this.timetables = this.editingTimetable?.id
          ? this.timetables.map(item => item.id === normalized.id ? normalized : item)
          : [...this.timetables, normalized];
        this.sortTimetables();
        this.closeTimetableForm();
      },
      error: (error: HttpErrorResponse) => {
        this.timetableError = error.error?.message || 'Failed to save timetable entry.';
      },
      complete: () => {
        this.isSavingTimetable = false;
      },
    });
  }

  confirmDeleteTimetable(entry: TimetableEntry): void {
    this.timetableToDelete = entry;
    this.showDeleteTimetableDialog = true;
    this.timetableError = '';
  }

  viewTimetable(entry: TimetableEntry): void {
    if (!this.subject?.id || !entry.id) {
      return;
    }

    this.router.navigate(['/admin/subjects', this.subject.id, 'timetable', entry.id]);
  }

  cancelDeleteTimetable(): void {
    this.timetableToDelete = null;
    this.showDeleteTimetableDialog = false;
  }

  deleteTimetable(): void {
    if (!this.timetableToDelete?.id || this.isSavingTimetable) {
      return;
    }

    this.isSavingTimetable = true;
    this.timetableError = '';

    this.backendService.delete<void>(`timetable/${this.timetableToDelete.id}`).subscribe({
      next: () => {
        this.timetables = this.timetables.filter(item => item.id !== this.timetableToDelete?.id);
        this.cancelDeleteTimetable();
      },
      error: (error: HttpErrorResponse) => {
        this.timetableError = error.error?.message || 'Failed to delete timetable entry.';
      },
      complete: () => {
        this.isSavingTimetable = false;
      },
    });
  }

  getDayLabel(dayOfWeek: string | null | undefined): string {
    return (dayOfWeek ?? '')
      .toLowerCase()
      .replace(/^\w/, value => value.toUpperCase());
  }

  getStudentNames(studentIds: number[] | null | undefined): string {
    const names = (studentIds ?? [])
      .map(id => this.assignedStudents.find(student => student.id === id)?.displayName)
      .filter((name): name is string => !!name);

    return names.length ? names.join(', ') : 'All assigned students';
  }

  formatTimeRange(entry: TimetableEntry): string {
    return `${this.normalizeTime(entry.startTime)} - ${this.normalizeTime(entry.endTime)}`;
  }

  exportTimetables(): void {
    if (!this.filteredTimetables.length) {
      this.timetableError = 'No timetable entries available to export for the current filters.';
      return;
    }

    const rows = this.filteredTimetables.map(entry => ({
      Day: this.getDayLabel(entry.dayOfWeek),
      'Start Time': this.normalizeTime(entry.startTime),
      'End Time': this.normalizeTime(entry.endTime),
      'Weekly Duration (Minutes)': this.getTimetableDurationMinutes(entry),
      Students: entry.studentCount ?? entry.studentIds?.length ?? 0,
      Lessons: entry.lessonCount ?? 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Timetables');
    XLSX.writeFile(
      workbook,
      `timetables_${(this.subject?.code || this.subject?.name || 'subject').replace(/\s+/g, '_')}.xlsx`
    );
    this.timetableError = '';
  }

  private loadAssignedStudents(subjectId: number) {
    this.backendService.get<any[]>(`subject/${subjectId}/students`).subscribe({
      next: (students) => {
        this.assignedStudents = (students ?? []).map(s => ({
          id: s.id,
          displayName: s.userFullName,
          email: s.userEmail,
          phone: s.userPhone,
          studentId: s.studentNumber ?? null,
        }));
        this.syncSubjectStudentCount();
        this.selectedAssignedStudentIds = [];
        this.currentPage = 1;
      },
      error: () => {
        this.studentsError = 'Failed to load assigned students.';
      },
    });
  }

  private saveAssignedStudents() {
    if (!this.subject?.id) return;
    const studentIds = this.assignedStudents.map(s => s.id);
    this.backendService.put(`subject/${this.subject.id}/students`, studentIds).subscribe({
      error: () => {
        this.studentsError = 'Failed to save student assignments.';
      },
    });
  }

  private loadTimetables(subjectId: number): void {
    this.isLoadingTimetables = true;
    this.timetableError = '';

    this.backendService.get<TimetableEntry[]>('timetable', { subjectId }).subscribe({
      next: (timetables) => {
        this.timetables = (timetables ?? []).map(entry => this.mapTimetable(entry));
        this.sortTimetables();
        this.timetableCurrentPage = 1;
      },
      error: (error: HttpErrorResponse) => {
        this.timetableError = error.error?.message || 'Failed to load timetable entries.';
      },
      complete: () => {
        this.isLoadingTimetables = false;
      },
    });
  }

  private sortTimetables(): void {
    this.timetables = [...this.timetables].sort((left, right) => {
      const dayCompare = this.dayOfWeekOptions.indexOf(left.dayOfWeek) - this.dayOfWeekOptions.indexOf(right.dayOfWeek);
      if (dayCompare !== 0) {
        return dayCompare;
      }

      return this.normalizeTime(left.startTime).localeCompare(this.normalizeTime(right.startTime));
    });
  }

  private mapTimetable(entry: TimetableEntry): TimetableEntry {
    return {
      ...entry,
      startTime: this.normalizeTime(entry.startTime),
      endTime: this.normalizeTime(entry.endTime),
      studentIds: entry.studentIds ?? [],
      studentCount: entry.studentCount ?? entry.studentIds?.length ?? 0,
      lessonCount: entry.lessonCount ?? 0,
    };
  }

  private matchesTimetableSearch(entry: TimetableEntry, query: string): boolean {
    if (!query) {
      return true;
    }

    return this.getDayLabel(entry.dayOfWeek).toLowerCase().includes(query)
      || this.normalizeTime(entry.startTime).toLowerCase().includes(query)
      || this.normalizeTime(entry.endTime).toLowerCase().includes(query)
      || String(entry.studentCount ?? entry.studentIds?.length ?? 0).includes(query)
      || String(entry.lessonCount ?? 0).includes(query);
  }

  private compareTimetables(left: TimetableEntry, right: TimetableEntry): number {
    switch (this.selectedTimetableSort) {
      case 'day-desc':
        return this.compareDay(right.dayOfWeek, left.dayOfWeek) || this.compareText(right.startTime, left.startTime);
      case 'time-desc':
        return this.compareText(right.startTime, left.startTime);
      case 'students-desc':
        return (right.studentCount ?? right.studentIds?.length ?? 0) - (left.studentCount ?? left.studentIds?.length ?? 0);
      case 'lessons-desc':
        return (right.lessonCount ?? 0) - (left.lessonCount ?? 0);
      case 'lessons-asc':
        return (left.lessonCount ?? 0) - (right.lessonCount ?? 0);
      case 'students-asc':
        return (left.studentCount ?? left.studentIds?.length ?? 0) - (right.studentCount ?? right.studentIds?.length ?? 0);
      case 'time-asc':
        return this.compareText(left.startTime, right.startTime);
      case 'day-asc':
      default:
        return this.compareDay(left.dayOfWeek, right.dayOfWeek) || this.compareText(left.startTime, right.startTime);
    }
  }

  private compareDay(left: string | null | undefined, right: string | null | undefined): number {
    return this.dayOfWeekOptions.indexOf(left ?? '') - this.dayOfWeekOptions.indexOf(right ?? '');
  }

  private compareText(left: string | null | undefined, right: string | null | undefined): number {
    return (left ?? '').localeCompare(right ?? '', undefined, { sensitivity: 'base' });
  }

  private normalizeTime(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return value.length >= 5 ? value.slice(0, 5) : value;
  }

  private createEmptyTimetableForm(): TimetableEntry {
    return {
      dayOfWeek: 'MONDAY',
      startTime: '',
      endTime: '',
      subjectId: this.subject?.id ?? null,
    };
  }

  private getSortValue(student: StudentOption, sortBy: 'firstName' | 'lastName'): string {
    const parts = (student.displayName ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) {
      return '';
    }

    return sortBy === 'lastName'
      ? parts[parts.length - 1]
      : parts[0];
  }

  private getTimetableDurationMinutes(entry: TimetableEntry): number {
    const [startHour, startMinute] = this.normalizeTime(entry.startTime).split(':').map(value => Number(value));
    const [endHour, endMinute] = this.normalizeTime(entry.endTime).split(':').map(value => Number(value));

    if ([startHour, startMinute, endHour, endMinute].some(value => Number.isNaN(value))) {
      return 0;
    }

    return ((endHour * 60) + endMinute) - ((startHour * 60) + startMinute);
  }

  private loadStudents(schoolId: number | null, gradeId: number | null) {
    if (!schoolId) return;

    this.backendService.get<any[]>('student', { schoolId }).subscribe({
      next: (students) => {
        this.availableStudents = (students ?? [])
          .filter(student => gradeId == null || student.gradeId === gradeId)
          .map(s => ({
            id: s.id,
            displayName: s.userFullName || s.userEmail || 'Unknown',
            email: s.userEmail ?? null,
            phone: s.userPhone ?? null,
            studentId: s.studentNumber ?? null,
            gradeId: s.gradeId ?? null,
          }));
        this.selectableStudents = [
          { id: SELECT_ALL_ID, displayName: 'Select All', email: null, phone: null, studentId: null },
          ...this.availableStudents,
        ];
      },
      error: () => {
        this.studentsError = 'Failed to load students.';
      },
    });
  }

  private getSelectedAssignedStudents(): StudentOption[] {
    const selectedIds = new Set(this.selectedAssignedStudentIds);
    return this.assignedStudents.filter(student => selectedIds.has(student.id));
  }

  private removeAssignedStudents(studentIds: number[]) {
    const idsToRemove = new Set(studentIds);
    this.assignedStudents = this.assignedStudents.filter(student => !idsToRemove.has(student.id));
    this.selectedAssignedStudentIds = this.selectedAssignedStudentIds.filter(id => !idsToRemove.has(id));
    this.syncSubjectStudentCount();
  }

  private syncSubjectStudentCount() {
    if (this.subject) {
      this.subject = {
        ...this.subject,
        studentCount: this.assignedStudents.length,
      };
    }
  }
}
