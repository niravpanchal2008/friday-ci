import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ApiService, APIOptions } from 'src/app/api.service';
import { SocketService } from 'src/app/socket.service';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-builds',
  templateUrl: './builds.component.html',
  styleUrls: ['./builds.component.scss']
})
export class BuildsComponent implements OnInit {

  @ViewChild('consoleWindow', { static: false }) consoleWindow: ElementRef<HTMLElement>;
  selectedLog: any;
  buildList: Array<any>;
  apiOptions: APIOptions;
  constructor(
    private api: ApiService,
    private toastr: ToastrService,
    private socketService: SocketService,
    private domSanitizer: DomSanitizer) {
    const self = this;
    self.buildList = [];
    self.apiOptions = {
      page: 1,
      count: 30,
      sort: '-started'
    };
  }

  ngOnInit(): void {
    const self = this;
    self.fetchBuilds();
    self.socketService.logs.subscribe(data => {
      if (self.selectedLog && self.selectedLog._id === data._id) {
        self.selectedLog.logs += data.logs;
        if (self.consoleWindow && self.consoleWindow.nativeElement) {
          setTimeout(() => {
            self.consoleWindow.nativeElement.scrollTo({
              top: self.consoleWindow.nativeElement.scrollHeight
            });
          }, 50);
        }
      }
    });
    self.socketService.buildStatus.subscribe(data => {
      if (self.selectedLog && self.selectedLog._id === data._id) {
        self.selectedLog.status = data.status;
      }
    });
  }

  fetchBuilds() {
    const self = this;
    self.api.get('builds', '/', self.apiOptions).subscribe((res: Array<any>) => {
      self.buildList = res;
    }, err => {
      self.toastr.error(err.error.message);
    });
  }

  refresh() {
    const self = this;
    self.api.get('builds', '/' + self.selectedLog._id).subscribe((res: any) => {
      self.selectedLog = res;
    }, err => {
      self.toastr.error(err.error.message);
    });
  }

  get logs() {
    const self = this;
    if (self.selectedLog) {
      return self.domSanitizer.bypassSecurityTrustHtml(self.selectedLog.logs);
    }
  }
}
