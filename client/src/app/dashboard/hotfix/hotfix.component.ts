import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { NgbModal, NgbModalRef, NgbTooltipConfig } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/api.service';

@Component({
  selector: 'app-hotfix',
  templateUrl: './hotfix.component.html',
  styleUrls: ['./hotfix.component.scss']
})
export class HotfixComponent implements OnInit {

  @ViewChild('triggerHotfixModal', { static: false }) triggerHotfixModal: TemplateRef<HTMLElement>;
  form: FormGroup;
  repoList: Array<any>;
  triggerHotfixModalRef: NgbModalRef;
  selectedRepo: any;
  machineList: Array<any>;
  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastr: ToastrService,
    private modal: NgbModal,
    private tooltipConfig: NgbTooltipConfig) {
    const self = this;
    self.repoList = [];
    self.machineList = [];
    self.form = self.fb.group({
      repo: [null, [Validators.required]],
      branch: [null, [Validators.required, Validators.minLength(3)]],
      hotfix: [1, [Validators.required, Validators.min(1)]],
      cleanBuild: [true, [Validators.required]],
      deploy: [false, [Validators.required]],
      upload: [false, [Validators.required]],
      baseImage: [false],
    });
  }

  ngOnInit(): void {
    const self = this;
    self.tooltipConfig.container = 'body';
    self.fetchRepoList();
    self.fetchMachineList();
    self.form.get('repo').disable();
    self.form.get('deploy').valueChanges.subscribe(flag => {
      if (flag) {
        self.form.addControl('namespace', new FormControl(null, [Validators.required, Validators.minLength(3), Validators.maxLength(28)]));
        self.form.addControl('machine', new FormControl('', [Validators.required]));
        self.form.get('upload').disable({
          emitEvent: false
        });
      } else {
        self.form.removeControl('namespace');
        self.form.removeControl('machine');
        self.form.get('upload').enable({
          emitEvent: false
        });
      }
    });
    self.form.get('upload').valueChanges.subscribe(flag => {
      if (flag) {
        self.form.get('deploy').disable({
          emitEvent: false
        });
        self.form.addControl('code', new FormControl(null, [Validators.required, Validators.minLength(6), Validators.maxLength(6)]));
      } else {
        self.form.removeControl('code');
        self.form.get('deploy').enable({
          emitEvent: false
        });
      }
    });
  }

  fetchRepoList() {
    const self = this;
    self.api.get('orcli', '/hotfix').subscribe((res: any) => {
      self.repoList = res;
    }, err => {
      self.toastr.error(err.error.message);
    });
  }

  fetchMachineList() {
    const self = this;
    self.api.get('machines', '/', { count: -1, select: 'name,_id' }).subscribe((res: any) => {
      self.machineList = res;
    }, err => {
      self.toastr.error(err.error.message);
    });
  }

  openHotfixModal(repo: any) {
    const self = this;
    self.selectedRepo = repo;
    self.form.get('repo').patchValue(repo.name);
    self.triggerHotfixModalRef = self.modal.open(self.triggerHotfixModal, { centered: true });
    self.triggerHotfixModalRef.result.then(close => {
      self.selectedRepo = null;
      self.form.reset({ cleanBuild: true, deploy: false, upload: false });
    }, dismiss => {
      self.selectedRepo = null;
      self.form.reset({ cleanBuild: true, deploy: false, upload: false });
    });
  }

  triggerHotfix() {
    const self = this;
    self.api.post('orcli', '/hotfix', self.form.getRawValue()).subscribe((res: any) => {
      self.triggerHotfixModalRef.close(false);
      self.toastr.success(res.message);
    }, err => {
      self.toastr.error(err.error.message);
    });
  }

  get imageTag() {
    const self = this;
    if (self.form.valid && self.selectedRepo.short) {
      return 'odp:'
        + self.selectedRepo.short.toLowerCase()
        + '.' + self.form.get('branch').value
        + '-hotfix-' + self.form.get('hotfix').value;
    }
    return '';
  }
}
