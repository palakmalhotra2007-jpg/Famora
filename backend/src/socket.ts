import { Server } from 'socket.io';

let io: Server | null = null;

export function setSocketServer(server: Server): void {
  io = server;
}

export function emitToFamily(familyId: string, event: string, data: unknown): void {
  io?.to(`family:${familyId}`).emit(event, data);
}
