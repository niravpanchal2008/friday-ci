import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { APIOptions, ApiService } from 'src/app/api.service';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit {

  @ViewChild('createTaskModel', { static: false }) createTaskModel: TemplateRef<HTMLElement>;
  @ViewChild('deleteTaskModel', { static: false }) deleteTaskModel: TemplateRef<HTMLElement>;
  @ViewChild('buildTaskModel', { static: false }) buildTaskModel: TemplateRef<HTMLElement>;
  form: FormGroup;
  selectedTask: any;
  taskList: Array<any>;
  apiOptions: APIOptions;
  createTaskModelRef: NgbModalRef;
  deleteTaskModelRef: NgbModalRef;
  buildTaskModelRef: NgbModalRef;
  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastr: ToastrService,
    private modal: NgbModal) {
    const self = this;
    self.taskList = [];
    self.apiOptions = {
      page: 1,
      count: 30
    };
    self.form = self.fb.group({
      name: [null, [Validators.required]],
      repo: [null, [Validators.required]],
      branch: [null, [Validators.required]],
      cron: [null],
      script: [null],
      sshKey: [null],
      lastBuild: [null]
    });
  }

  ngOnInit(): void {
    const self = this;
    self.fetchTasks();
  }

  fetchTasks() {
    const self = this;
    self.api.get('tasks', '/', self.apiOptions).subscribe((res: any) => {
      self.taskList = res;
    }, err => {
      self.toastr.error(err.error.message);
    });
  }

  openCreateTaskModal() {
    const self = this;
    self.createTaskModelRef = self.modal.open(self.createTaskModel);
    self.createTaskModelRef.result.then(close => {
      self.selectedTask = {};
      self.form.reset({});
    }, dismiss => {
      self.selectedTask = {};
      self.form.reset({});
    });
  }

  triggerCreate() {
    const self = this;
    self.api.post('tasks', '/', self.form.value).subscribe((res: any) => {
      self.taskList = res;
      self.createTaskModelRef.close(false);
      self.fetchTasks();
      self.toastr.success('Task has been created');
    }, err => {
      self.toastr.error(err.error.message);
    });
  }

  openDeleteTaskModal(task) {
    const self = this;
    self.selectedTask = task;
    self.deleteTaskModelRef = self.modal.open(self.deleteTaskModel);
    self.deleteTaskModelRef.result.then(close => {
      self.selectedTask = {};
    }, dismiss => {
      self.selectedTask = {};
    });
  }

  triggerDelete() {
    const self = this;
    self.api.delete('tasks', '/' + self.selectedTask._id).subscribe((res: any) => {
      self.taskList = res;
      self.deleteTaskModelRef.close(false);
      self.fetchTasks();
      self.toastr.success('Task has been deleted');
    }, err => {
      self.toastr.error(err.error.message);
    });
  }

  openBuildTaskModal(task) {
    const self = this;
    self.selectedTask = task;
    self.buildTaskModelRef = self.modal.open(self.buildTaskModel);
    self.buildTaskModelRef.result.then(close => {
      self.selectedTask = {};
    }, dismiss => {
      self.selectedTask = {};
    });
  }

  triggerBuild() {
    const self = this;
    self.api.delete('tasks', '/utils/build/' + self.selectedTask._id).subscribe((res: any) => {
      self.taskList = res;
      self.deleteTaskModelRef.close(false);
      self.fetchTasks();
      self.toastr.success('Task has been deleted');
    }, err => {
      self.toastr.error(err.error.message);
    });
  }
}
