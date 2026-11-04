import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExportNotificationEvent } from '../../models/transaction-log.model';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private messageSubject = new Subject<{ destination: string; body: any }>();
  private pendingSubscriptions: string[] = [];

  constructor(private ngZone: NgZone) { }

  /**
   * Kết nối tới WebSocket endpoint (hỗ trợ SockJS protocol qua WebSocket transport)
   */
  connect(): Promise<void> {
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      try {
        const wsUrl = environment.apiUrl.replace(/^http/, 'ws') + '/ws/websocket';
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          // Gửi STOMP CONNECT frame bọc trong SockJS array framing: ["CONNECT\n..."]
          const connectFrame = 'CONNECT\naccept-version:1.2,1.1,1.0\nheart-beat:10000,10000\n\n\0';
          this.socket?.send(JSON.stringify([connectFrame]));
        };

        this.socket.onmessage = (event) => {
          this.ngZone.run(() => {
            const data: string = event.data;
            if (!data) return;

            // SockJS open / heartbeat
            if (data === 'o' || data === 'h') {
              return;
            }

            // SockJS array frame: a["..."]
            if (data.startsWith('a[')) {
              try {
                const rawArray: string[] = JSON.parse(data.substring(1));
                rawArray.forEach((frame) => this.handleStompFrame(frame, resolve));
              } catch (err) {
                console.warn('Lỗi parse SockJS frame:', err);
              }
            } else {
              // Direct frame nếu server không bọc array
              this.handleStompFrame(data, resolve);
            }
          });
        };

        this.socket.onerror = (err) => {
          console.warn('WebSocket connection warning/error:', err);
          this.isConnected = false;
        };

        this.socket.onclose = () => {
          this.isConnected = false;
          this.socket = null;
        };

        // Fallback timeout: nếu không kết nối được sau 4s thì vẫn resolve để polling hoạt động
        setTimeout(() => {
          if (!this.isConnected) {
            resolve();
          }
        }, 4000);

      } catch (e) {
        console.warn('Không thể khởi tạo kết nối WebSocket:', e);
        resolve();
      }
    });
  }

  private handleStompFrame(frame: string, connectResolve?: () => void): void {
    if (!frame) return;

    if (frame.startsWith('CONNECTED')) {
      this.isConnected = true;
      if (connectResolve) connectResolve();

      // Gửi các topic đang chờ đăng ký
      this.pendingSubscriptions.forEach((dest) => {
        this.sendSubscribe(dest);
      });
      this.pendingSubscriptions = [];
      return;
    }

    if (frame.startsWith('MESSAGE')) {
      const headerEnd = frame.indexOf('\n\n');
      if (headerEnd === -1) return;

      const headerText = frame.substring(0, headerEnd);
      let bodyText = frame.substring(headerEnd + 2);
      if (bodyText.endsWith('\0')) {
        bodyText = bodyText.substring(0, bodyText.length - 1);
      }

      let destination = '';
      const lines = headerText.split('\n');
      for (const line of lines) {
        if (line.startsWith('destination:')) {
          destination = line.substring('destination:'.length).trim();
          break;
        }
      }

      try {
        const parsedBody = JSON.parse(bodyText);
        this.messageSubject.next({ destination, body: parsedBody });
      } catch {
        this.messageSubject.next({ destination, body: bodyText });
      }
    }
  }

  private sendSubscribe(destination: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const subId = 'sub-' + Math.random().toString(36).substring(2, 9);
    const subFrame = `SUBSCRIBE\nid:${subId}\ndestination:${destination}\n\n\0`;
    this.socket.send(JSON.stringify([subFrame]));
  }

  /**
   * Đăng ký lắng nghe sự kiện xuất file của một jobId cụ thể qua WebSocket
   */
  subscribeExportJob(jobId: string): Observable<ExportNotificationEvent> {
    const topic = `/topic/export/${jobId}`;

    if (this.isConnected) {
      this.sendSubscribe(topic);
    } else {
      this.pendingSubscriptions.push(topic);
      this.connect();
    }

    const jobSubject = new Subject<ExportNotificationEvent>();
    const subscription = this.messageSubject.asObservable().subscribe((msg) => {
      if (msg.destination === topic) {
        jobSubject.next(msg.body as ExportNotificationEvent);
      }
    });

    return new Observable<ExportNotificationEvent>((observer) => {
      const sub = jobSubject.subscribe(observer);
      return () => {
        sub.unsubscribe();
        subscription.unsubscribe();
      };
    });
  }

  disconnect(): void {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {
        console.warn('Lỗi khi đóng WebSocket:', e);
      }
      this.socket = null;
      this.isConnected = false;
    }
  }
}

