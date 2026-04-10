import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'

interface AuthSocket extends Socket {
  userId?: string
  username?: string
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  // Track online users: userId -> socketId
  private onlineUsers = new Map<string, string>()

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1]

      if (!token) {
        client.disconnect()
        return
      }

      const payload = this.jwt.verify(token) as { sub: string; email: string }
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })

      if (!user) {
        client.disconnect()
        return
      }

      client.userId = user.id
      client.username = user.username
      this.onlineUsers.set(user.id, client.id)

      // Notify others this user is online
      this.server.emit('user:online', { userId: user.id, username: user.username })
      console.log(`✅ ${user.username} connected`)
    } catch {
      client.disconnect()
    }
  }

  handleDisconnect(client: AuthSocket) {
    if (client.userId) {
      this.onlineUsers.delete(client.userId)
      this.server.emit('user:offline', { userId: client.userId })
      console.log(`❌ ${client.username} disconnected`)
    }
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    if (!client.userId) return

    // Verify membership
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: data.roomId, userId: client.userId } },
    })
    if (!member) {
      client.emit('error', { message: 'Not a member of this room' })
      return
    }

    client.join(data.roomId)
    client.to(data.roomId).emit('room:user_joined', {
      userId: client.userId,
      username: client.username,
      roomId: data.roomId,
    })
  }

  @SubscribeMessage('room:leave')
  handleLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    client.leave(data.roomId)
    client.to(data.roomId).emit('room:user_left', {
      userId: client.userId,
      username: client.username,
      roomId: data.roomId,
    })
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @MessageBody() data: { roomId: string; content: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    if (!client.userId || !data.content?.trim()) return

    // Verify membership
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: data.roomId, userId: client.userId } },
    })
    if (!member) {
      client.emit('error', { message: 'Not a member of this room' })
      return
    }

    // Save to DB
    const message = await this.prisma.message.create({
      data: {
        roomId: data.roomId,
        userId: client.userId,
        content: data.content.trim(),
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    })

    // Broadcast to everyone in the room
    this.server.to(data.roomId).emit('message:new', message)
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    client.to(data.roomId).emit('typing:start', {
      userId: client.userId,
      username: client.username,
      roomId: data.roomId,
    })
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    client.to(data.roomId).emit('typing:stop', {
      userId: client.userId,
      roomId: data.roomId,
    })
  }

  getOnlineUsers() {
    return Array.from(this.onlineUsers.keys())
  }
}
