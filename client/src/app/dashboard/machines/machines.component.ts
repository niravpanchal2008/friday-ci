import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { APIOptions, ApiService } from 'src/app/api.service';

@Component({
  selector: 'app-machines',
  templateUrl: './machines.component.html',
  styleUrls: ['./machines.component.scss']
})
export class MachinesComponent implements OnInit {

  @ViewChild('createMachineModel', { static: false }) createMachineModel: TemplateRef<HTMLElement>;
  @ViewChild('deleteMachineModel', { static: false }) deleteMachineModel: TemplateRef<HTMLElement>;
  form: FormGroup;
  selectedMachine: any;
  machineList: Array<any>;
  apiOptions: APIOptions;
  createMachineModelRef: NgbModalRef;
  deleteMachineModelRef: NgbModalRef;
  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastr: ToastrService,
    private modal: NgbModal) {
    const self = this;
    self.machineList = [];
    self.apiOptions = {
      page: 1,
      count: 30
    };
    self.form = self.fb.group({
      name: [null, [Validators.required]],
      ip: [null, [Validators.required]],
      port: [null, [Validators.required]]
    });
  }

  ngOnInit(): void {
    const self = this;
    self.fetchMachines();
  }

  fetchMachines() {
    const self = this;
    self.api.get('machines', '/', self.apiOptions).subscribe((res: any) => {
      self.machineList = res;
      self.machineList.forEach(item => {
        self.getMachineStatus(item);
      });
    }, err => {
      self.toastr.error(err.error.message);
    });
  }

  openCreateMachineModal() {
    const self = this;
    self.createMachineModelRef = self.modal.open(self.createMachineModel);
    self.createMachineModelRef.result.then(close => {
      self.selectedMachine = {};
      self.form.reset({});
    }, dismiss => {
      self.selectedMachine = {};
      self.form.reset({});
    });
  }

  triggerCreate() {
    const self = this;
    self.api.post('machines', '/', self.form.value).subscribe((res: any) => {
      self.machineList = res;
      self.createMachineModelRef.close(false);
      self.fetchMachines();
      self.toastr.success('Machine has been created');
    }, err => {
      self.toastr.error(err.error.message);
    });
  }

  openDeleteMachineModal(machine) {
    const self = this;
    self.selectedMachine = machine;
    self.deleteMachineModelRef = self.modal.open(self.deleteMachineModel);
    self.deleteMachineModelRef.result.then(close => {
      self.selectedMachine = {};
    }, dismiss => {
      self.selectedMachine = {};
    });
  }

  triggerDelete() {
    const self = this;
    self.api.delete('machines', '/' + self.selectedMachine._id).subscribe((res: any) => {
      self.machineList = res;
      self.deleteMachineModelRef.close(false);
      self.fetchMachines();
      self.toastr.success('Machine has been deleted');
    }, err => {
      self.toastr.error(err.error.message);
    });
  }

  getMachineStatus(machine) {
    const self = this;
    self.api.post('machines', '/utils/status', machine).subscribe((res: any) => {
      machine.status = res.status;
    }, err => {
      machine.status = 'Unreachable';
      self.toastr.error(err.error.message);
    });
  }

  triggerBuild() {
    const self = this;
    self.api.delete('machines', '/utils/build/' + self.selectedMachine._id).subscribe((res: any) => {
      self.machineList = res;
      self.deleteMachineModelRef.close(false);
      self.fetchMachines();
      self.toastr.success('Machine has been deleted');
    }, err => {
      self.toastr.error(err.error.message);
    });
  }

}
