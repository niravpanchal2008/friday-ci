import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

import { SocketService } from '../socket.service';
import { ApiService } from '../api.service';
import { ToastrService } from 'ngx-toastr';
import { NgSwitchDefault } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  constructor(
    private socketService: SocketService,
    private apiService: ApiService,
    private router: Router,
    private toastr: ToastrService) { }

  ngOnInit(): void {
    const self = this;
    self.socketService.connect();
  }

  ngOnDestroy() {
    const self = this;
    self.socketService.disconnect();
  }

  logout() {
    const self = this;
    self.apiService.delete('auth', '/logout').subscribe(res => {
      self.toastr.success('Logged out Successfully');
      self.router.navigate(['/']);
    }, err => {
      self.toastr.error('Unable to logout');
    });
  }
}
