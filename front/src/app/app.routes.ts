import { Matches } from './pages/matches/matches';
import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Home } from './pages/home/home';
import { EditProfile } from './pages/edit-profile/edit-profile';
import { Error404Page, Error503Page} from './pages/error-pages/error-page';
import { Liked } from './pages/liked/liked';

export const routes: Routes = [
  {path: '', component: Home},
  {path: 'likes', component: Liked},
  {path: 'matches', component: Matches},
  {path: 'matches/profile/:id', component: Matches},
  {path: 'matches/profile/:id/chat', component: Matches},
  {path: 'profile', component: EditProfile, pathMatch: 'full'},
  {path: 'profile/:id', component: Home},
  {path: 'login', component: Login},
  {path: 'register', component: Login},
  {path: 'error-503',  component: Error503Page},
  {path: '**',  component: Error404Page}
];
