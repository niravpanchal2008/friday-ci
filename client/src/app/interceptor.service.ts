import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class InterceptorService implements HttpInterceptor {

  constructor(
    private data: DataService,
    private toastr: ToastrService,
    private router: Router) { }
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const headers: any = {
      'Content-Type': 'application/json'
    };
    if (this.data.userData && this.data.userData.token) {
      headers.Authorization = this.data.userData.token;
    }
    const request = req.clone({
      setHeaders: headers
    });
    return next.handle(request).pipe(catchError((error: HttpErrorResponse) => {
      let message = '';
      message = error && error.error.message ? error.error.message :
        'We are unable to process request, please try again after sometime.';
      if (error.status === 401 && error.error.message === 'Unauthorized') {
        this.toastr.error(message);
        this.router.navigate(['/']);
      }
      return throwError(error);
    }));
  }
}
