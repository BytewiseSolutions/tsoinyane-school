import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Navbar } from './shared/navbar/navbar';
import { Footer } from './shared/footer/footer';
import { Home } from './pages/home/home';
import { About } from './pages/about/about';
import { Contact } from './pages/contact/contact';
import { Subjects } from './pages/subjects/subjects';
import { Login } from './pages/login/login';
import { NotFound } from './pages/not-found/not-found';
import { PrivacyPolicy } from './pages/privacy-policy/privacy-policy';
import { TermsConditions } from './pages/terms-conditions/terms-conditions';
import { Accessibility } from './pages/accessibility/accessibility';
import { Sidebar } from './admin/layout/sidebar/sidebar';
import { AdminHeader } from './admin/layout/header/header';
import { AdminMain } from './admin/layout/main/main';
import { AdminFooter } from './admin/layout/footer/footer';
import { Dashboard } from './admin/dashboard/dashboard';
import { Students } from './admin/students/students';
import { Teachers } from './admin/teachers/teachers';
import { AdminSubjects } from './admin/subjects/subjects';
import { Events } from './admin/events/events';
import { Settings } from './admin/settings/settings';
import { StudentForm } from './admin/students/student-form/student-form';
import { TeacherForm } from './admin/teachers/teacher-form/teacher-form';
import { SubjectForm } from './admin/subjects/subject-form/subject-form';
import { EventForm } from './admin/events/event-form/event-form';

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
    NotFound,
    PrivacyPolicy,
    TermsConditions,
    Accessibility,
    Sidebar,
    AdminHeader,
    AdminMain,
    AdminFooter,
    Dashboard,
    Students,
    Teachers,
    AdminSubjects,
    Events,
    Settings,
    StudentForm,
    TeacherForm,
    SubjectForm,
    EventForm
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [App]
})
export class AppModule { }
