import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../util/backend.service';
import { User } from './user';
import { Role } from './role';
import { Status } from './status';
import { finalize, forkJoin, Subject, takeUntil } from 'rxjs';
import { SchoolContextService } from '../layout/school-context';
import { hasRole } from '../../auth/auth-session';
import * as XLSX from 'xlsx';

type UserRoleFilter = 'All' | 'SYSTEM_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT';
type UserStatusFilter = 'All' | 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'DELETED';
type UserSortOption = 'name-asc' | 'name-desc' | 'email-asc' | 'email-desc' | 'status-asc' | 'created-desc' | 'created-asc';

@Component({
  selector: 'app-users',
  standalone: false,
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  readonly Role = Role;
  readonly pageSizeOptions = [10, 25, 50];
  readonly statusFilterOptions: Array<{ value: UserStatusFilter, label: string }> = [
    { value: 'All', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'DELETED', label: 'Deleted' },
  ];
  readonly sortOptions: Array<{ value: UserSortOption, label: string }> = [
    { value: 'name-asc', label: 'Name A-Z' },
    { value: 'name-desc', label: 'Name Z-A' },
    { value: 'email-asc', label: 'Email A-Z' },
    { value: 'email-desc', label: 'Email Z-A' },
    { value: 'status-asc', label: 'Status' },
    { value: 'created-desc', label: 'Newest First' },
    { value: 'created-asc', label: 'Oldest First' },
  ];
  searchTerm = '';
  roleFilter: UserRoleFilter = 'All';
  statusFilter: UserStatusFilter = 'All';
  sortOption: UserSortOption = 'name-asc';
  pageSize = 10;
  currentPage = 1;
  isLoading = false;
  errorMessage = '';
  showUserForm = false;
  isProcessing = false;
  editingUser: User | null = null;
  showDeleteDialog = false;
  userToDelete: User | null = null;
  showBulkDeleteDialog = false;
  showStatusDialog = false;
  userToToggleStatus: User | null = null;
  pendingStatus: Status = Status.INACTIVE;
  selectedSchoolId: number | null = null;
  users: User[] = [];
  selectedUserIds: number[] = [];
  presetRoles: Role[] = [];

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
      });

    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredUsers(): User[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.schoolScopedUsers.filter(user => {
      const userRoles = this.getUserRoles(user).map(role => role.toUpperCase());
      const roleMatch = this.roleFilter === 'All' || userRoles.includes(this.roleFilter);
      const statusMatch = this.statusFilter === 'All'
        || (user.status ?? '').toUpperCase() === this.statusFilter;
      const queryMatch = !query
        || this.getFullName(user).toLowerCase().includes(query)
        || (user.email ?? '').toLowerCase().includes(query)
        || this.getRoleLabels(user).toLowerCase().includes(query)
        || this.getUserInfoValue(user).toLowerCase().includes(query);
      return roleMatch && statusMatch && queryMatch;
    });
  }

  get sortedUsers(): User[] {
    return [...this.filteredUsers].sort((left, right) => this.compareUsers(left, right));
  }

  get paginatedUsers(): User[] {
    const start = (this.safeCurrentPage - 1) * this.pageSize;
    return this.sortedUsers.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.sortedUsers.length / this.pageSize));
  }

  get safeCurrentPage(): number {
    return Math.min(this.currentPage, this.totalPages);
  }

  get pageStart(): number {
    if (!this.sortedUsers.length) {
      return 0;
    }

    return (this.safeCurrentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.safeCurrentPage * this.pageSize, this.sortedUsers.length);
  }

  get schoolScopedUsers(): User[] {
    return this.users.filter(user =>
      !this.selectedSchoolId
      || !user.schoolIds?.length
      || user.schoolIds.includes(this.selectedSchoolId)
    );
  }

  get totalUsers(): number {
    return this.schoolScopedUsers.length;
  }

  get totalAdmins(): number {
    return this.schoolScopedUsers.filter(user => {
      const roles = this.getUserRoles(user);
      return roles.includes(Role.SYSTEM_ADMIN) || roles.includes(Role.SCHOOL_ADMIN);
    }).length;
  }

  get totalTeachers(): number {
    return this.schoolScopedUsers.filter(user => this.getUserRoles(user).includes(Role.TEACHER)).length;
  }

  get totalStudents(): number {
    return this.schoolScopedUsers.filter(user => this.getUserRoles(user).includes(Role.STUDENT)).length;
  }

  get availableRoleTabs(): Array<{ value: UserRoleFilter, label: string }> {
    const tabs: Array<{ value: UserRoleFilter, label: string }> = [
      { value: 'All', label: 'All Users' },
    ];

    if (hasRole(Role.SYSTEM_ADMIN)) {
      tabs.push(
        { value: 'SYSTEM_ADMIN', label: 'System Admin' },
        { value: 'SCHOOL_ADMIN', label: 'School Admin' },
      );
    }

    tabs.push(
      { value: 'TEACHER', label: 'Teacher' },
      { value: 'STUDENT', label: 'Students' },
    );

    return tabs;
  }

  get summaryCards(): Array<{ label: string, value: number, filter: UserRoleFilter }> {
    const cards: Array<{ label: string, value: number, filter: UserRoleFilter }> = [
      { label: this.isSystemAdmin ? 'All Users' : 'School Users', value: this.totalUsers, filter: 'All' },
    ];

    if (this.isSystemAdmin) {
      cards.push(
        { label: 'System Admin', value: this.getCountForRoleFilter('SYSTEM_ADMIN'), filter: 'SYSTEM_ADMIN' },
        { label: 'School Admin', value: this.getCountForRoleFilter('SCHOOL_ADMIN'), filter: 'SCHOOL_ADMIN' },
      );
    }

    cards.push(
      { label: 'Teachers', value: this.totalTeachers, filter: 'TEACHER' },
      { label: 'Students', value: this.totalStudents, filter: 'STUDENT' },
    );

    return cards;
  }

  get isSystemAdmin(): boolean {
    return hasRole(Role.SYSTEM_ADMIN);
  }

  get pageDescription(): string {
    return this.isSystemAdmin
      ? 'Manage System Admins, School Admins, Teachers, and Students from one place.'
      : 'Manage teachers and students for the selected school from one place.';
  }

  get infoColumnLabel(): string {
    switch (this.roleFilter) {
      case 'STUDENT':
        return 'Student Grade';
      case 'TEACHER':
        return 'Assigned Grades';
      case 'SYSTEM_ADMIN':
      case 'SCHOOL_ADMIN':
        return 'School Access';
      default:
        return 'Grade / Access';
    }
  }

  get selectedUsersCount(): number {
    return this.selectedUsers.length;
  }

  get selectedUsers(): User[] {
    const selectedIds = new Set(this.selectedUserIds);
    return this.sortedUsers.filter(user => user.id != null && selectedIds.has(user.id));
  }

  get selectablePaginatedUsers(): User[] {
    return this.paginatedUsers.filter(user => !!user.id && this.canEditUser(user));
  }

  get allPaginatedUsersSelected(): boolean {
    return this.selectablePaginatedUsers.length > 0
      && this.selectablePaginatedUsers.every(user => this.selectedUserIds.includes(user.id));
  }

  get partiallySelectedPaginatedUsers(): boolean {
    return this.selectablePaginatedUsers.some(user => this.selectedUserIds.includes(user.id))
      && !this.allPaginatedUsersSelected;
  }

  get hasSelectedUsers(): boolean {
    return this.selectedUsersCount > 0;
  }

  get emptyStateMessage(): string {
    const roleLabel = this.getCollectionLabelForRoleFilter(this.roleFilter);

    if (this.searchTerm.trim()) {
      return `No ${roleLabel} matched "${this.searchTerm.trim()}". Try clearing your search.`;
    }

    if (this.statusFilter !== 'All') {
      return `No ${roleLabel} are ${this.formatStatusFilterLabel(this.statusFilter).toLowerCase()} right now.`;
    }

    switch (this.roleFilter) {
      case 'SYSTEM_ADMIN':
        return 'No system admins found.';
      case 'SCHOOL_ADMIN':
        return 'No school admins found.';
      case 'TEACHER':
        return 'No teachers found yet.';
      case 'STUDENT':
        return 'No students found yet.';
      case 'All':
      default:
        return 'No users found for the selected filters.';
    }
  }

  get usersNeedingRoleCleanup(): User[] {
    return this.schoolScopedUsers.filter(user => this.hasMixedRoles(user));
  }

  get hasUsersNeedingRoleCleanup(): boolean {
    return this.usersNeedingRoleCleanup.length > 0;
  }

  toggleStatus(user: User) {
    if (!user.id || this.isProcessing) {
      return;
    }

    const current = user.status;
    this.pendingStatus = current === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;
    this.userToToggleStatus = user;
    this.showStatusDialog = true;
  }

  cancelToggleStatus() {
    this.userToToggleStatus = null;
    this.showStatusDialog = false;
  }

  confirmToggleStatus() {
    if (!this.userToToggleStatus?.id || this.isProcessing) {
      return;
    }

    const targetUser = this.userToToggleStatus;

    const payload: User = {
      ...targetUser,
      password: null,
      status: this.pendingStatus,
    };

    this.isProcessing = true;
    this.errorMessage = '';

    this.backendService.put<User, User>(`user/${targetUser.id}`, payload)
      .pipe(finalize(() => {
        this.isProcessing = false;
      }))
      .subscribe({
        next: (updatedUser) => {
          this.users = this.users.map(item => (item.id === updatedUser.id ? updatedUser : item));
          this.cancelToggleStatus();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = error.error?.message || 'Failed to update user status.';
          this.cancelToggleStatus();
        },
      });
  }

  removeUser(user: User) {
    if (!user.id || this.isProcessing) {
      return;
    }

    this.userToDelete = user;
    this.showDeleteDialog = true;
  }

  cancelDeleteUser() {
    this.userToDelete = null;
    this.showDeleteDialog = false;
  }

  openBulkDeleteDialog(): void {
    if (!this.hasSelectedUsers || this.isProcessing) {
      return;
    }

    this.showBulkDeleteDialog = true;
  }

  cancelBulkDeleteUsers(): void {
    this.showBulkDeleteDialog = false;
  }

  confirmDeleteUser() {
    if (!this.userToDelete?.id || this.isProcessing) {
      return;
    }

    const targetUser = this.userToDelete;

    this.isProcessing = true;
    this.errorMessage = '';

    this.backendService.delete<void>(`user/${targetUser.id}`)
      .pipe(finalize(() => {
        this.isProcessing = false;
      }))
      .subscribe({
        next: () => {
          this.users = this.users.filter(item => item.id !== targetUser.id);
          this.cancelDeleteUser();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = error.error?.message || 'Failed to remove user.';
          this.cancelDeleteUser();
        },
      });
  }

  editUser(user: User) {
    this.editingUser = { ...user };
    this.presetRoles = [];
    this.showUserForm = true;
  }

  openAddUserForm(presetRoles: Role[] = []) {
    this.editingUser = null;
    this.presetRoles = presetRoles;
    this.showUserForm = true;
  }

  closeAddUserForm() {
    this.showUserForm = false;
    this.editingUser = null;
    this.presetRoles = [];
  }

  onUserSaved(user: User) {
    const exists = this.users.some(item => item.id === user.id);
    this.users = exists
      ? this.users.map(item => (item.id === user.id ? user : item))
      : [user, ...this.users];
    this.syncSelectedUserIds();
    this.showUserForm = false;
    this.editingUser = null;
    this.presetRoles = [];
  }

  onFiltersChanged(): void {
    this.currentPage = 1;
    this.syncSelectedUserIds();
  }

  setRoleFilter(filter: UserRoleFilter): void {
    if (this.roleFilter === filter) {
      return;
    }

    this.roleFilter = filter;
    this.onFiltersChanged();
  }

  getCountForRoleFilter(filter: UserRoleFilter): number {
    if (filter === 'All') {
      return this.totalUsers;
    }

    return this.schoolScopedUsers.filter(user =>
      this.getUserRoles(user).some(role => role.toUpperCase() === filter)
    ).length;
  }

  isUserSelected(userId: number): boolean {
    return this.selectedUserIds.includes(userId);
  }

  toggleUserSelection(userId: number, checked: boolean): void {
    if (checked) {
      if (!this.selectedUserIds.includes(userId)) {
        this.selectedUserIds = [...this.selectedUserIds, userId];
      }
      return;
    }

    this.selectedUserIds = this.selectedUserIds.filter(id => id !== userId);
  }

  toggleAllPaginatedUsers(checked: boolean): void {
    const paginatedIds = this.selectablePaginatedUsers.map(user => user.id);

    if (checked) {
      this.selectedUserIds = [...new Set([...this.selectedUserIds, ...paginatedIds])];
      return;
    }

    this.selectedUserIds = this.selectedUserIds.filter(id => !paginatedIds.includes(id));
  }

  clearSelectedUsers(): void {
    this.selectedUserIds = [];
  }

  bulkActivateUsers(): void {
    this.updateSelectedUsersStatus(Status.ACTIVE);
  }

  bulkDeactivateUsers(): void {
    this.updateSelectedUsersStatus(Status.INACTIVE);
  }

  bulkDeleteUsers(): void {
    if (!this.hasSelectedUsers || this.isProcessing) {
      return;
    }
    this.openBulkDeleteDialog();
  }

  confirmBulkDeleteUsers(): void {
    if (!this.hasSelectedUsers || this.isProcessing) {
      return;
    }

    const targetUsers = [...this.selectedUsers];
    const requests = targetUsers
      .filter(user => !!user.id && this.canDeleteUser(user))
      .map(user => this.backendService.delete<void>(`user/${user.id}`));

    if (!requests.length) {
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';

    forkJoin(requests)
      .pipe(finalize(() => {
        this.isProcessing = false;
      }))
      .subscribe({
        next: () => {
          const deletedIds = new Set(targetUsers.map(user => user.id));
          this.users = this.users.filter(user => !deletedIds.has(user.id));
          this.selectedUserIds = [];
          this.showBulkDeleteDialog = false;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = error.error?.message || 'Failed to delete selected users.';
        },
      });
  }

  exportFilteredUsers(): void {
    if (!this.sortedUsers.length) {
      this.errorMessage = 'No users are available to export for the current filters.';
      return;
    }

    const rows = this.sortedUsers.map(user => ({
      Name: this.getFullName(user),
      Email: user.email ?? '',
      Phone: user.phone ?? '',
      Roles: this.getRoleLabels(user),
      'Grade / Access': this.getUserInfoValue(user),
      Status: this.getStatusLabel(user.status),
      School: this.getSchoolNamesLabel(user),
      'Created Date': this.formatDate(user.createdAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    XLSX.writeFile(workbook, `users_${this.roleFilter.toLowerCase()}_${this.statusFilter.toLowerCase()}.xlsx`);
    this.errorMessage = '';
  }

  onPageSizeChanged(): void {
    this.currentPage = 1;
    this.syncSelectedUserIds();
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

  private loadUsers() {
    this.isLoading = true;
    this.errorMessage = '';

    this.backendService.get<User[]>('user').subscribe({
      next: (response) => {
        this.users = response;
        this.syncSelectedUserIds();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load users.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  getFullName(user: User): string {
    const firstName = (user.firstName ?? '').trim();
    const lastName = (user.lastName ?? '').trim();
    return `${firstName} ${lastName}`.trim() || 'Unknown User';
  }

  getRoleLabels(user: User): string {
    const labels = this.getUserRoles(user).map(role => this.formatRole(role));
    return labels.length ? labels.join(', ') : 'Unknown';
  }

  getRoleBadges(user: User): string[] {
    return this.getUserRoles(user).map(role => this.formatRole(role));
  }

  getSchoolNamesLabel(user: User): string {
    const schoolNames = user.schoolNames?.filter(name => (name ?? '').trim().length > 0) ?? [];
    return schoolNames.length ? schoolNames.join(', ') : 'All schools';
  }

  getUserInfoValue(user: User): string {
    const roles = this.getUserRoles(user);

    if (roles.includes(Role.STUDENT)) {
      return user.gradeName?.trim() || 'Grade not assigned';
    }

    if (roles.includes(Role.TEACHER)) {
      const teacherGrades = user.teacherGradeNames?.filter(name => (name ?? '').trim().length > 0) ?? [];
      return teacherGrades.length ? teacherGrades.join(', ') : 'No grades assigned';
    }

    return this.getSchoolNamesLabel(user);
  }

  needsStudentGrade(user: User): boolean {
    const roles = this.getUserRoles(user);
    return roles.includes(Role.STUDENT) && !user.gradeName?.trim();
  }

  hasMixedRoles(user: User): boolean {
    return this.getUserRoles(user).length > 1;
  }

  getRoleCleanupMessage(user: User): string {
    return `${this.getFullName(user)} has multiple roles. Open Edit to clean this up.`;
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getStatusLabel(status?: string | null): 'Active' | 'Inactive' | 'Pending' | 'Deleted' {
    const normalized = (status ?? '').trim().toUpperCase();

    switch (normalized) {
      case 'ACTIVE':
        return 'Active';
      case 'INACTIVE':
        return 'Inactive';
      case 'PENDING':
        return 'Pending';
      case 'DELETED':
        return 'Deleted';
      default:
        return 'Inactive';
    }
  }

  canEditUser(user: User): boolean {
    const isSystemAdmin = hasRole('SYSTEM_ADMIN');
    
    if (isSystemAdmin) {
      return true;
    }
    
    const userRoles = this.getUserRoles(user);
    return !userRoles.includes(Role.SYSTEM_ADMIN) && !userRoles.includes(Role.SCHOOL_ADMIN);
  }

  canDeleteUser(user: User): boolean {
    return this.canEditUser(user);
  }

  canAssignGradeFromList(user: User): boolean {
    return this.getUserRoles(user).includes(Role.STUDENT);
  }

  toggleSort(column: 'name' | 'email' | 'status' | 'created'): void {
    switch (column) {
      case 'name':
        this.sortOption = this.sortOption === 'name-asc' ? 'name-desc' : 'name-asc';
        break;
      case 'email':
        this.sortOption = this.sortOption === 'email-asc' ? 'email-desc' : 'email-asc';
        break;
      case 'status':
        this.sortOption = 'status-asc';
        break;
      case 'created':
        this.sortOption = this.sortOption === 'created-desc' ? 'created-asc' : 'created-desc';
        break;
    }

    this.onFiltersChanged();
  }

  getSortIndicator(column: 'name' | 'email' | 'status' | 'created'): string {
    switch (column) {
      case 'name':
        return this.sortOption === 'name-desc' ? '↓' : '↑';
      case 'email':
        return this.sortOption === 'email-desc' ? '↓' : '↑';
      case 'status':
        return '↑';
      case 'created':
        return this.sortOption === 'created-asc' ? '↑' : '↓';
    }
  }

  isSortActive(column: 'name' | 'email' | 'status' | 'created'): boolean {
    return (column === 'name' && this.sortOption.startsWith('name'))
      || (column === 'email' && this.sortOption.startsWith('email'))
      || (column === 'status' && this.sortOption === 'status-asc')
      || (column === 'created' && this.sortOption.startsWith('created'));
  }

  private updateSelectedUsersStatus(status: Status): void {
    if (!this.hasSelectedUsers || this.isProcessing) {
      return;
    }

    const targetUsers = this.selectedUsers.filter(user => !!user.id && this.canEditUser(user));
    const requests = targetUsers.map(user => {
      const payload: User = {
        ...user,
        password: null,
        status,
      };

      return this.backendService.put<User, User>(`user/${user.id}`, payload);
    });

    if (!requests.length) {
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';

    forkJoin(requests)
      .pipe(finalize(() => {
        this.isProcessing = false;
      }))
      .subscribe({
        next: (updatedUsers) => {
          const updatedMap = new Map(updatedUsers.map(user => [user.id, user]));
          this.users = this.users.map(user => updatedMap.get(user.id) ?? user);
          this.selectedUserIds = [];
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = error.error?.message || 'Failed to update selected users.';
        },
      });
  }

  private getUserRoles(user: User): Role[] {
    if (user.roles && user.roles.length > 0) {
      return user.roles;
    }
    if (user.role) {
      return [user.role];
    }
    return [];
  }

  private formatRole(role: Role): string {
    switch (role) {
      case Role.SYSTEM_ADMIN:
        return 'System Admin';
      case Role.SCHOOL_ADMIN:
        return 'School Admin';
      case Role.TEACHER:
        return 'Teacher';
      case Role.STUDENT:
        return 'Student';
      default:
        return 'Unknown';
    }
  }

  private formatStatusFilterLabel(status: UserStatusFilter): string {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'INACTIVE':
        return 'Inactive';
      case 'PENDING':
        return 'Pending';
      case 'DELETED':
        return 'Deleted';
      case 'All':
      default:
        return 'All';
    }
  }

  private getCollectionLabelForRoleFilter(filter: UserRoleFilter): string {
    switch (filter) {
      case 'SYSTEM_ADMIN':
        return 'system admins';
      case 'SCHOOL_ADMIN':
        return 'school admins';
      case 'TEACHER':
        return 'teachers';
      case 'STUDENT':
        return 'students';
      case 'All':
      default:
        return 'users';
    }
  }

  private compareUsers(left: User, right: User): number {
    switch (this.sortOption) {
      case 'name-desc':
        return this.compareText(this.getFullName(right), this.getFullName(left));
      case 'email-asc':
        return this.compareText(left.email, right.email);
      case 'email-desc':
        return this.compareText(right.email, left.email);
      case 'status-asc':
        return this.compareText(this.getStatusLabel(left.status), this.getStatusLabel(right.status))
          || this.compareText(this.getFullName(left), this.getFullName(right));
      case 'created-desc':
        return this.compareDate(right.createdAt, left.createdAt)
          || this.compareText(this.getFullName(left), this.getFullName(right));
      case 'created-asc':
        return this.compareDate(left.createdAt, right.createdAt)
          || this.compareText(this.getFullName(left), this.getFullName(right));
      case 'name-asc':
      default:
        return this.compareText(this.getFullName(left), this.getFullName(right));
    }
  }

  private compareText(left?: string | null, right?: string | null): number {
    return (left ?? '').localeCompare(right ?? '', undefined, { sensitivity: 'base' });
  }

  private compareDate(left?: string | null, right?: string | null): number {
    const leftTime = left ? new Date(left).getTime() : 0;
    const rightTime = right ? new Date(right).getTime() : 0;
    return leftTime - rightTime;
  }

  private syncSelectedUserIds(): void {
    const selectableIds = new Set(
      this.sortedUsers
        .filter(user => !!user.id && this.canEditUser(user))
        .map(user => user.id)
    );

    this.selectedUserIds = this.selectedUserIds.filter(id => selectableIds.has(id));
  }
}
