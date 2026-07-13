import * as SecureStore from "expo-secure-store";
import { io, Socket } from "socket.io-client";

// same host as API_URL in lib/api.ts, without the /api/v1 prefix
const SOCKET_URL = "http://172.20.10.7:5000";

let socket: Socket | null = null;

export const getSocket = async (): Promise<Socket> => {
  if (socket?.connected) return socket;

  const token = await SecureStore.getItemAsync("lifecare_token");

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket"],
  });

  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
