import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { About } from './pages/about/about';
import { Contact } from './pages/contact/contact';
import { Subjects } from './pages/subjects/subjects';
import { Login } from './pages/login/login';
import { PrivacyPolicy } from './pages/privacy-policy/privacy-policy';
import { TermsConditions } from './pages/terms-conditions/terms-conditions';
import { Accessibility } from './pages/accessibility/accessibility';
import { Dashboard } from './admin/dashboard/dashboard';
import { AdminMain } from './admin/layout/main/main';
import { Students } from './admin/students/students';
import { Teachers } from './admin/teachers/teachers';
import { AdminSubjects } from './admin/subjects/subjects';
import { Events } from './admin/events/events';
import { Settings } from './admin/settings/settings';
import { NotFound } from './pages/not-found/not-found';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: Home },
  { path: 'about', component: About },
  { path: 'contact', component: Contact },
  { path: 'subjects', component: Subjects },
  { path: 'login', component: Login },
  { path: 'privacy-policy', component: PrivacyPolicy },
  { path: 'terms-conditions', component: TermsConditions },
  { path: 'accessibility', component: Accessibility },
  {
    path: 'admin',
    component: Dashboard,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminMain },
      { path: 'students', component: Students },
      { path: 'teachers', component: Teachers },
      { path: 'subjects', component: AdminSubjects },
      { path: 'events', component: Events },
      { path: 'settings', component: Settings },
    ]
  },
  { path: '**', component: NotFound },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
