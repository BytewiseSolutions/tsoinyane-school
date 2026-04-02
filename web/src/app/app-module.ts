import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Navbar } from './shared/navbar/navbar';
import { Footer } from './shared/footer/footer';
import { Home } from './pages/home/home';
import { About } from './pages/about/about';
import { Contact } from './pages/contact/contact';
import { Subjects } from './pages/subjects/subjects';
import { Login } from './pages/login/login';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { NotFound } from './pages/not-found/not-found';
import { PrivacyPolicy } from './pages/privacy-policy/privacy-policy';
import { TermsConditions } from './pages/terms-conditions/terms-conditions';
import { Accessibility } from './pages/accessibility/accessibility';
import { Sidebar } from './admin/layout/sidebar/sidebar';
import { AdminHeader } from './admin/layout/header/header';
import { AdminMain } from './admin/layout/main/main';
import { AdminFooter } from './admin/layout/footer/footer';
import { Dashboard } from './admin/dashboard/dashboard';
import { Users } from './admin/users/users';
import { UserForm } from './admin/users/user-form/user-form';
import { UserImportComponent } from './admin/users/import/import';
import { UserDetails } from './admin/users/user-details/user-details';
import { AdminGrades } from './admin/grades/grades';
import { GradeForm } from './admin/grades/grade-form/grade-form';
import { GradeImportComponent } from './admin/grades/import/import';
import { AdminSubjects } from './admin/subjects/subjects';
import { Events } from './admin/events/events';
import { ActivityLogs } from './admin/activity-logs/activity-logs';
import { Notifications } from './admin/notifications/notifications';
import { NotificationForm } from './admin/notifications/notification-form/notification-form';
import { Profile } from './admin/profile/profile';
import { Reports } from './admin/reports/reports';
import { Fees } from './admin/fees/fees';
import { MySubjects } from './admin/teacher/my-subjects/my-subjects';
import { MyTimetable } from './admin/teacher/my-timetable/my-timetable';
import { MyLessons } from './admin/teacher/my-lessons/my-lessons';
import { Settings } from './admin/settings/settings';
import { SubjectForm } from './admin/subjects/subject-form/subject-form';
import { SubjectDetail } from './admin/subjects/subject-detail/subject-detail';
import { TimetableDetail } from './admin/subjects/timetable-detail/timetable-detail';
import { LessonDetail } from './admin/subjects/lesson-detail/lesson-detail';
import { EventForm } from './admin/events/event-form/event-form';
import { AuthInterceptor } from './auth/auth.interceptor';

@NgModule({
  declarations: [
    App,
    Navbar,
    Footer,
    Home,
    About,
    Contact,
    Subjects,
    Login,
    ForgotPassword,
    NotFound,
    PrivacyPolicy,
    TermsConditions,
    Accessibility,
    Sidebar,
    AdminHeader,
    AdminMain,
    AdminFooter,
    Dashboard,
    Users,
    UserForm,
    UserImportComponent,
    UserDetails,
    AdminGrades,
    GradeForm,
    GradeImportComponent,
    AdminSubjects,
    Events,
    ActivityLogs,
    Notifications,
    NotificationForm,
    Profile,
    Reports,
    Fees,
    MySubjects,
    MyTimetable,
    MyLessons,
    Settings,
    SubjectForm,
    SubjectDetail,
    TimetableDetail,
    LessonDetail,
    EventForm
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    NgSelectModule,
    AppRoutingModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    }
  ],
  bootstrap: [App]
})
export class AppModule { }
