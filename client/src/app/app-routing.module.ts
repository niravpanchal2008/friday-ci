import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HomeComponent } from './dashboard/home/home.component';
import { ReleaseComponent } from './dashboard/release/release.component';
import { HotfixComponent } from './dashboard/hotfix/hotfix.component';
import { LoginGuard } from './guards/login.guard';
import { AuthGuard } from './guards/auth.guard';
import { BuildsComponent } from './dashboard/builds/builds.component';
import { TasksComponent } from './dashboard/tasks/tasks.component';
import { MachinesComponent } from './dashboard/machines/machines.component';


const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent, canActivate: [LoginGuard] },
  {
    path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard], canActivateChild: [AuthGuard], children: [
      { path: '', pathMatch: 'full', redirectTo: 'hotfix' },
      { path: 'home', component: HomeComponent },
      { path: 'tasks', component: TasksComponent },
      { path: 'hotfix', component: HotfixComponent },
      { path: 'release', component: ReleaseComponent },
      { path: 'builds', component: BuildsComponent },
      { path: 'machines', component: MachinesComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    useHash: true
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
