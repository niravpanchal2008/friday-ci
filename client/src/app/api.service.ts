import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpRequest } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) { }

  post(type: string, path: string, data: any) {
    const self = this;
    const url = '/orcli/api' + environment.api[type] + path;
    return self.http.post(url, data);
  }

  put(type: string, path: string, data: any) {
    const self = this;
    const url = '/orcli/api' + environment.api[type] + path;
    return self.http.put(url, data);
  }

  get(type: string, path: string, options?: APIOptions) {
    const self = this;
    let params = new HttpParams();
    if (options && options.select) {
      params = params.append('select', options.select);
    }
    if (options && options.sort) {
      params = params.append('sort', options.sort);
    }
    if (options && options.filter) {
      params = params.append('filter', options.filter);
    }
    if (options && options.page) {
      params = params.append('page', options.page.toString());
    }
    if (options && options.count) {
      params = params.append('count', options.count.toString());
    }
    const url = '/orcli/api' + environment.api[type] + path;
    return self.http.get(url, { params });
  }

  delete(type: string, path: string) {
    const self = this;
    const url = '/orcli/api' + environment.api[type] + path;
    return self.http.delete(url);
  }

  request(options: HttpRequest<any>) {
    const self = this;
    return self.http.request(options);
  }
}


export interface APIOptions {
  select?: string;
  sort?: string;
  filter?: string;
  page?: number;
  count?: number;
  countOnly?: number;
}
