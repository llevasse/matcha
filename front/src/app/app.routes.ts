import { adminGuard } from './../../admin-guard';
import { Matches } from './pages/matches/matches';
import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Home } from './pages/home/home';
import { EditProfile } from './pages/edit-profile/edit-profile';
import { Error403Page, Error404Page} from './pages/error-pages/error-page';
import { Likes } from './pages/likes/likes';
import { Admin } from './pages/admin/admin';
import { HistoryPage } from './pages/history/history';
import { ConfirmEmail } from './pages/confirm-email/confirm-email';
import { ResetPassword } from './pages/reset-password/reset-password';

export const routes: Routes = [
  {path: '', component: Home},
  {path: 'likes', component: Likes},
  {path: 'likes/profile/:id', component: Likes},
  {path: 'matches', component: Matches},
  {path: 'matches/profile/:id', component: Matches},
  {path: 'matches/profile/:id/chat', component: Matches},
  {path: 'profile', component: EditProfile, pathMatch: 'full'},
  {path: 'profile/:id', component: Home},
  {path: 'login', component: Login},
  {path: 'register', component: Login},
  {path: 'confirm-email', component: ConfirmEmail},
  {path: 'reset-password', component: ResetPassword},
  {path: 'admin', canMatch: [adminGuard], component: Admin},
  {path: 'admin', component: Error403Page},
  {path: 'history', component: HistoryPage},
  {path: 'history/profile/:id', component: HistoryPage},
  {path: '**',  component: Error404Page}
];
