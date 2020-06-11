import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule, ToastrService } from 'ngx-toastr';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HotfixComponent } from './dashboard/hotfix/hotfix.component';
import { ApiService } from './api.service';
import { DataService } from './data.service';
import { HomeComponent } from './dashboard/home/home.component';
import { ReleaseComponent } from './dashboard/release/release.component';
import { BuildsComponent } from './dashboard/builds/builds.component';
import { TasksComponent } from './dashboard/tasks/tasks.component';
import { SocketService } from './socket.service';
import { MachinesComponent } from './dashboard/machines/machines.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    HotfixComponent,
    HomeComponent,
    ReleaseComponent,
    BuildsComponent,
    TasksComponent,
    MachinesComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgbModule,
    ToastrModule.forRoot({
      autoDismiss: false,
      closeButton: true,
      countDuplicates: true,
      enableHtml: true,
      maxOpened: 3
    })
  ],
  providers: [
    ApiService,
    DataService,
    ToastrService,
    SocketService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
