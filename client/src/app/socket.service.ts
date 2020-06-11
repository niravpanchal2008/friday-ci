import { Injectable, EventEmitter } from '@angular/core';
import * as io from 'socket.io-client';


@Injectable({
  providedIn: 'root'
})
export class SocketService {

  socket: SocketIOClient.Socket;
  logs: EventEmitter<string>;
  buildStatus: EventEmitter<string>;
  constructor() {
    const self = this;
    self.logs = new EventEmitter();
    self.buildStatus = new EventEmitter();
  }

  connect() {
    const self = this;
    self.socket = io('/', {
      path: '/orcli/socket'
    });
    self.socket.on('logs', function (data) {
      self.logs.emit(data);
    });
    self.socket.on('buildStatus', function (data) {
      self.buildStatus.emit(data);
    });
  }

  disconnect() {
    const self = this;
    self.socket.disconnect();
  }
}
