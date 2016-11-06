import * as ioclient from 'socket.io-client';

export type ReturnFunction = (returnedValue: any, thrownException: any) => any;
export type CodeFunction = (returnMethod: ReturnFunction, args: any[]) => void;
export type EventFunction = (...args: any[]) => void;

class RemoteError extends Error {
  stack: any;
  constructor(thrownException: any) {
    super(thrownException.message);
    this.name = thrownException.remote_name;
    this.message = thrownException.remote_message;
    this.stack = thrownException.remote_stack;
  }
}
interface ReturnedValueAndThrownException {
  returnedValue: any;
  thrownException: any;
}

export interface SioRpcClientConnectionStatusListener {
  onConnectionStatusChange(status: boolean): void;
}

export class SioRpcClient {

  socket: SocketIOClient.Socket;

  constructor(url: string, connectionStatusListener?: SioRpcClientConnectionStatusListener) {
    this.socket = ioclient.connect(url);
    if (typeof connectionStatusListener !== 'undefined') {
      this.socket.on('disconnect', () => {
        connectionStatusListener.onConnectionStatusChange(false);
      });
      this.socket.on('connect', () => {
        connectionStatusListener.onConnectionStatusChange(true);
      });
    }
  }
  call(methodName: string, ...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit(methodName, args, (returnedValueAndThrownException: ReturnedValueAndThrownException) => {
        if (typeof returnedValueAndThrownException.thrownException !== 'undefined') {
          return reject(new RemoteError(returnedValueAndThrownException.thrownException));
        }
        resolve(returnedValueAndThrownException.returnedValue);
      });
    });
  }
  subscribe(eventName: string, eventCode: EventFunction) {
    this.socket.on(eventName, (args: any[]) => {
      eventCode.apply(null, args);
    });
  }
  subscribeOnce(eventName: string, eventCode: EventFunction) {
    this.socket.once(eventName, (args: any[]) => {
      eventCode.apply(null, args);
    });
  }

}
