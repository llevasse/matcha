import { Matches } from './pages/matches/matches';
import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Home } from './pages/home/home';
import { EditProfile } from './pages/edit-profile/edit-profile';
import { Error404Page, Error503Page} from './pages/error-pages/error-page';
import { Likes } from './pages/likes/likes';
import { Admin } from './pages/admin/admin';
import { HistoryPage } from './pages/history/history';

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
  {path: 'error-503',  component: Error503Page},
  {path: 'admin', component: Admin},
  {path: 'history', component: HistoryPage},
  {path: '**',  component: Error404Page}
];
