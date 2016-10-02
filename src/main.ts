import * as ioclient from 'socket.io-client';

export type ReturnFunction = (returnedValue: any, thrownException: any) => any;
export type CodeFunction = (returnMethod: ReturnFunction, args: any[]) => void;
export type EventFunction = (...args: any[]) => void;

class RemoteError extends Error {
  constructor(thrownException: any) {
    super(thrownException.message);
    this.name = thrownException.remote_name;
    this.message = thrownException.remote_message;
    this.stack = thrownException.remote_stack;
  }
}
interface CookieAndArgs {
  cookie: string;
  args: any[];
}
interface ReturnedValueAndThrownException {
  returnedValue: any;
  thrownException: any;
}

function S4(): string {
  // tslint:disable-next-line no-bitwise
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}
function GUID(): string {
  return `${S4()}${S4()}-${S4()}-4${S4().substr(0,3)}-${S4()}-${S4()}${S4()}${S4()}`;
}

export class SioRpcClient {

  socket: SocketIOClient.Socket;

  constructor(url: string) {
    this.socket = ioclient.connect(url);
  }
  call(methodName: string, ...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const cookie = GUID();
      this.socket.once(`${methodName}..return..${cookie}`, (returnedValueAndThrownException: ReturnedValueAndThrownException) => {
        if (typeof returnedValueAndThrownException.thrownException !== 'undefined') {
          return reject(new RemoteError(returnedValueAndThrownException.thrownException));
        }
        resolve(returnedValueAndThrownException.returnedValue);
      });
      this.socket.emit(`${methodName}..call`, <CookieAndArgs>{ cookie, args });
    });
  }
  subscribe(eventName: string, eventCode: EventFunction) {
    this.socket.on(`${eventName}..event`, (args: any[]) => {
      eventCode.apply(null, args);
    });
  }
  subscribeOnce(eventName: string, eventCode: EventFunction) {
    this.socket.once(`${eventName}..event`, (args: any[]) => {
      eventCode.apply(null, args);
    });
  }

}
