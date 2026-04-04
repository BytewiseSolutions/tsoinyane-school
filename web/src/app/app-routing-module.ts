import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { About } from './pages/about/about';
import { Contact } from './pages/contact/contact';
import { Subjects } from './pages/subjects/subjects';
import { Login } from './pages/login/login';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { PrivacyPolicy } from './pages/privacy-policy/privacy-policy';
import { TermsConditions } from './pages/terms-conditions/terms-conditions';
import { Accessibility } from './pages/accessibility/accessibility';
import { Dashboard } from './admin/dashboard/dashboard';
import { AdminMain } from './admin/layout/main/main';
import { Users } from './admin/users/users';
import { UserImportComponent } from './admin/users/import/import';
import { UserDetails } from './admin/users/user-details/user-details';
import { AdminSubjects } from './admin/subjects/subjects';
import { SubjectDetail } from './admin/subjects/subject-detail/subject-detail';
import { SubjectsImport } from './admin/subjects/import/import';
import { TimetableImport } from './admin/subjects/timetable-import/timetable-import';
import { TimetableDetail } from './admin/subjects/timetable-detail/timetable-detail';
import { LessonDetail } from './admin/subjects/lesson-detail/lesson-detail';
import { AdminGrades } from './admin/grades/grades';
import { GradeImportComponent } from './admin/grades/import/import';
import { Events } from './admin/events/events';
import { ActivityLogs } from './admin/activity-logs/activity-logs';
import { Notifications } from './admin/notifications/notifications';
import { Profile } from './admin/profile/profile';
import { Reports } from './admin/reports/reports';
import { Fees } from './admin/fees/fees';
import { InstallmentPlans } from './admin/fees/installment-plans/installment-plans';
import { InstallmentDetails } from './admin/fees/installment-plans/installment-details';
import { FeeReports } from './admin/fees/fee-reports';
import { FeePayments } from './admin/fees/fee-payments';
import { FeeStructureDetail } from './admin/fees/fee-structure-detail/fee-structure-detail';
import { FeePaymentDetail } from './admin/fees/fee-payment-detail/fee-payment-detail';
import { MySubjects } from './admin/teacher/my-subjects';
import { MyStudents } from './admin/teacher/my-students';
import { MyStudentDetails } from './admin/teacher/my-student-details';
import { MySubjectDetails } from './admin/teacher/my-subject-details/my-subject-details';
import { MyLessonDetails } from './admin/teacher/my-lesson-details';
import { MyTimetable } from './admin/teacher/my-timetable';
import { MyLessons } from './admin/teacher/my-lessons';
import { MyAssessments } from './admin/teacher/my-assessments';
import { MyAssessmentDetails } from './admin/teacher/my-assessment-details';
import { Settings } from './admin/settings/settings';
import { NotFound } from './pages/not-found/not-found';
import { AuthGuard } from './auth/auth-guard';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: Home },
  { path: 'about', component: About },
  { path: 'contact', component: Contact },
  { path: 'subjects', component: Subjects },
  { path: 'login', component: Login },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'privacy-policy', component: PrivacyPolicy },
  { path: 'terms-conditions', component: TermsConditions },
  { path: 'accessibility', component: Accessibility },
  {
    path: 'admin',
    component: Dashboard,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminMain },
      { path: 'users', component: Users, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'users/import', component: UserImportComponent, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'users/:id', component: UserDetails, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'grades', component: AdminGrades, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'grades/import', component: GradeImportComponent, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'subjects', component: AdminSubjects, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'subjects/import', component: SubjectsImport, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'subjects/:id', component: SubjectDetail, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'subjects/:id/timetable/import', component: TimetableImport, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'subjects/:id/timetable/:timetableId', component: TimetableDetail, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'subjects/:id/timetable/:timetableId/lessons/:lessonId', component: LessonDetail, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'events', component: Events, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'fees', component: Fees, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'fees/reports', component: FeeReports, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'fees/installments', component: InstallmentPlans, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'fees/installments/:id', component: InstallmentDetails, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'fees/payments', component: FeePayments, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'fees/payments/:id', component: FeePaymentDetail, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'fees/:id', component: FeeStructureDetail, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'activity-logs', component: ActivityLogs, data: { roles: ['SYSTEM_ADMIN'] } },
      { path: 'notifications', component: Notifications },
      { path: 'profile', component: Profile },
      { path: 'reports', component: Reports, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'] } },
      { path: 'settings', component: Settings, data: { roles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'] } },
      { path: 'my-subjects', component: MySubjects, data: { roles: ['TEACHER'] } },
      { path: 'my-students', component: MyStudents, data: { roles: ['TEACHER'] } },
      { path: 'my-students/:studentId', component: MyStudentDetails, data: { roles: ['TEACHER'] } },
      { path: 'my-subjects/:assignmentId', component: MySubjectDetails, data: { roles: ['TEACHER'] } },
      { path: 'my-timetable', component: MyTimetable, data: { roles: ['TEACHER'] } },
      { path: 'my-lessons', component: MyLessons, data: { roles: ['TEACHER'] } },
      { path: 'my-lessons/:lessonId', component: MyLessonDetails, data: { roles: ['TEACHER'] } },
      { path: 'my-assessments', component: MyAssessments, data: { roles: ['TEACHER'] } },
      { path: 'my-assessments/:assessmentId', component: MyAssessmentDetails, data: { roles: ['TEACHER'] } },
    ]
  },
  { path: '**', component: NotFound },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
