import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';
import { DataService, UserData } from '../data.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  form: FormGroup;
  message: string;
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private api: ApiService,
    private data: DataService) {
    const self = this;
    self.form = self.fb.group({
      username: [null, [Validators.required]],
      password: [null, [Validators.required]]
    });
  }

  ngOnInit(): void {
    const self = this;

  }

  doLogin() {
    const self = this;
    self.api.post('auth', '/login', self.form.value).subscribe((res: UserData) => {
      self.data.userData = res;
      self.router.navigate(['dashboard']);
    }, err => {
      if (err.error && err.error.message) {
        self.message = err.error.message;
      } else {
        self.message = err.message;
      }
    });
  }

}
