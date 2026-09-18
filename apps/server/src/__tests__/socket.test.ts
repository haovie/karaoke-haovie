import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, Server as HttpServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { InMemoryRoomStore } from '../store/memory';
import { setupSocketHandlers } from '../socket/handlers';
import { C2S, S2C } from '@karaoke/shared';

describe('Socket.IO Handlers', () => {
  let httpServer: HttpServer;
  let ioServer: Server;
  let store: InMemoryRoomStore;
  let port: number;
  let clients: ClientSocket[];

  beforeEach(() => {
    clients = [];
    return new Promise<void>((resolve) => {
      store = new InMemoryRoomStore();
      const app = express();
      httpServer = createServer(app);
      ioServer = new Server(httpServer, { cors: { origin: '*' } });
      setupSocketHandlers(ioServer, store);
      httpServer.listen(0, () => {
        const addr = httpServer.address() as any;
        port = addr.port;
        resolve();
      });
    });
  });

  afterEach(() => {
    clients.forEach(c => c.disconnect());
    return new Promise<void>((resolve) => {
      ioServer.close();
      httpServer.close(() => resolve());
    });
  });

  function createClient(): ClientSocket {
    const client = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    clients.push(client);
    return client;
  }

  function waitForConnect(client: ClientSocket): Promise<void> {
    return new Promise((resolve) => {
      if (client.connected) return resolve();
      client.on('connect', () => resolve());
      client.connect();
    });
  }

  function waitForEvent(socket: ClientSocket, event: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeout);
      socket.once(event, (data: any) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  it('should create a room and receive room state', async () => {
    const client = createClient();
    await waitForConnect(client);

    const statePromise = waitForEvent(client, S2C.ROOM_STATE);
    client.emit(C2S.ROOM_CREATE, { nickname: 'Host' });
    const state = await statePromise;

    expect(state.roomCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(state.queue).toEqual([]);
    expect(state.users).toHaveLength(1);
    expect(state.users[0].nickname).toBe('Host');
  });

  it('should join a room and broadcast user:joined', async () => {
    const host = createClient();
    await waitForConnect(host);

    // Host creates room
    const hostStatePromise = waitForEvent(host, S2C.ROOM_STATE);
    host.emit(C2S.ROOM_CREATE, { nickname: 'Host' });
    const state = await hostStatePromise;

    // Set up listener for user:joined BEFORE remote joins
    const joinedPromise = waitForEvent(host, S2C.USER_JOINED);

    // Remote joins room
    const remote = createClient();
    await waitForConnect(remote);
    const remoteStatePromise = waitForEvent(remote, S2C.ROOM_STATE);
    remote.emit(C2S.ROOM_JOIN, { roomCode: state.roomCode, nickname: 'Alice' });

    const [joined, remoteState] = await Promise.all([joinedPromise, remoteStatePromise]);
    expect(joined.nickname).toBe('Alice');
    expect(remoteState.users).toHaveLength(2);
  });

  it('should add to queue and broadcast queue:updated', async () => {
    const host = createClient();
    await waitForConnect(host);

    // Host creates room
    const hostStatePromise = waitForEvent(host, S2C.ROOM_STATE);
    host.emit(C2S.ROOM_CREATE, { nickname: 'Host' });
    const state = await hostStatePromise;

    // Remote joins
    const remote = createClient();
    await waitForConnect(remote);
    const remoteStatePromise = waitForEvent(remote, S2C.ROOM_STATE);
    remote.emit(C2S.ROOM_JOIN, { roomCode: state.roomCode, nickname: 'Alice' });
    const remoteState = await remoteStatePromise;

    // Set up listener for queue update BEFORE adding
    const updatePromise = waitForEvent(host, S2C.QUEUE_UPDATED);

    // Remote adds song
    remote.emit(C2S.QUEUE_ADD, {
      videoId: 'testVid123ab',
      title: 'Test Song',
      channelTitle: 'Test Channel',
      thumbnailUrl: 'https://i.ytimg.com/vi/testVid123ab/mqdefault.jpg',
      durationSec: 240,
      nickname: 'Alice',
      version: remoteState.version,
    });

    const update = await updatePromise;
    expect(update.queue).toHaveLength(1);
    expect(update.queue[0].videoId).toBe('testVid123ab');
    expect(update.queue[0].addedBy).toBe('Alice');
  });

  it('should emit error for joining non-existent room', async () => {
    const client = createClient();
    await waitForConnect(client);

    const errPromise = waitForEvent(client, S2C.ERROR);
    client.emit(C2S.ROOM_JOIN, { roomCode: 'ZZZZZZ', nickname: 'Test' });
    const err = await errPromise;
    expect(err.error).toBeTruthy();
  });

  it('should broadcast user:left on disconnect', async () => {
    const host = createClient();
    await waitForConnect(host);

    // Host creates room
    const hostStatePromise = waitForEvent(host, S2C.ROOM_STATE);
    host.emit(C2S.ROOM_CREATE, { nickname: 'Host' });
    const state = await hostStatePromise;

    // Remote joins
    const remote = createClient();
    await waitForConnect(remote);
    const remoteStatePromise = waitForEvent(remote, S2C.ROOM_STATE);
    remote.emit(C2S.ROOM_JOIN, { roomCode: state.roomCode, nickname: 'Alice' });
    await remoteStatePromise;

    // Set up listener BEFORE disconnect
    const leftPromise = waitForEvent(host, S2C.USER_LEFT);
    remote.disconnect();

    const left = await leftPromise;
    expect(left.socketId).toBeTruthy();
  });

  it('should remove item from queue and broadcast queue:updated', async () => {
    const host = createClient();
    await waitForConnect(host);

    // Host creates room
    const hostStatePromise = waitForEvent(host, S2C.ROOM_STATE);
    host.emit(C2S.ROOM_CREATE, { nickname: 'Host' });
    const state = await hostStatePromise;

    // Remote Alice joins
    const alice = createClient();
    await waitForConnect(alice);
    const aliceStatePromise = waitForEvent(alice, S2C.ROOM_STATE);
    alice.emit(C2S.ROOM_JOIN, { roomCode: state.roomCode, nickname: 'Alice' });
    const aliceState = await aliceStatePromise;

    // Alice adds song
    const addPromise = waitForEvent(host, S2C.QUEUE_UPDATED);
    alice.emit(C2S.QUEUE_ADD, {
      videoId: 'vidAlice1234',
      title: 'Alice Song',
      channelTitle: 'Alice Channel',
      thumbnailUrl: 'https://i.ytimg.com/vi/vidAlice1234/mqdefault.jpg',
      durationSec: 200,
      nickname: 'Alice',
      version: aliceState.version,
    });
    const afterAdd = await addPromise;
    expect(afterAdd.queue).toHaveLength(1);
    const item = afterAdd.queue[0];

    // Remote Bob joins
    const bob = createClient();
    await waitForConnect(bob);
    const bobStatePromise = waitForEvent(bob, S2C.ROOM_STATE);
    bob.emit(C2S.ROOM_JOIN, { roomCode: state.roomCode, nickname: 'Bob' });
    await bobStatePromise;

    // Bob tries to remove Alice's song -> should fail
    const bobErrPromise = waitForEvent(bob, S2C.ERROR);
    bob.emit(C2S.QUEUE_REMOVE, {
      itemId: item.id,
      nickname: 'Bob',
      version: afterAdd.version,
    });
    const bobErr = await bobErrPromise;
    expect(bobErr.error).toBeTruthy();

    // Alice removes her own song -> should succeed
    const removePromise = waitForEvent(host, S2C.QUEUE_UPDATED);
    alice.emit(C2S.QUEUE_REMOVE, {
      itemId: item.id,
      nickname: 'Alice',
      version: afterAdd.version,
    });
    const afterRemove = await removePromise;
    expect(afterRemove.queue).toHaveLength(0);
  });
});
