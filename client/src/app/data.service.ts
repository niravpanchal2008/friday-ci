import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  userData: UserData;
  constructor() { }
}


export interface UserData {
  username: string;
  type: string;
  token: string;
}
