import * as SecureStore from "expo-secure-store";
import { io, Socket } from "socket.io-client";
import { API_URL } from "./api";

const SOCKET_URL = new URL(API_URL).origin;

let socket: Socket | null = null;
let socketPromise: Promise<Socket> | null = null;

export const getSocket = (): Promise<Socket> => {
  if (socket) return Promise.resolve(socket);
  if (socketPromise) return socketPromise;

  socketPromise = SecureStore.getItemAsync("lifecare_token")
    .then((token) => {
      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket"],
      });

      return socket;
    })
    .catch((error: unknown) => {
      socketPromise = null;
      throw error;
    });

  return socketPromise;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
  socketPromise = null;
};
