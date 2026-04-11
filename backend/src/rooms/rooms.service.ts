import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateRoomDto } from './dto/create-room.dto'

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.room.findMany({
      where: { isPrivate: false, isDm: false },
      include: {
        _count: { select: { members: true, messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
        _count: { select: { messages: true } },
      },
    })
    if (!room) throw new NotFoundException('Room not found')
    return room
  }

  async create(dto: CreateRoomDto, userId: string) {
    const room = await this.prisma.room.create({
      data: {
        name: dto.name,
        description: dto.description,
        isPrivate: dto.isPrivate ?? false,
        createdBy: userId,
        members: {
          create: { userId },
        },
      },
    })
    return room
  }

  async join(roomId: string, userId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } })
    if (!room) throw new NotFoundException('Room not found')

    const existing = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    })
    if (existing) throw new ConflictException('Already a member')

    return this.prisma.roomMember.create({ data: { roomId, userId } })
  }

  async leave(roomId: string, userId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } })
    if (!room) throw new NotFoundException('Room not found')
    if (room.createdBy === userId) throw new ForbiddenException('Room creator cannot leave')

    return this.prisma.roomMember.delete({
      where: { roomId_userId: { roomId, userId } },
    })
  }

  async findOrCreateDm(userId: string, targetUserId: string) {
    // Find existing DM between these two users
    const existing = await this.prisma.room.findFirst({
      where: {
        isDm: true,
        members: { every: { userId: { in: [userId, targetUserId] } } },
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: { members: { include: { user: { select: { id: true, username: true, avatar: true } } } } },
    })
    if (existing) return existing

    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } })
    if (!targetUser) throw new NotFoundException('User not found')

    return this.prisma.room.create({
      data: {
        name: `dm_${userId}_${targetUserId}`,
        isDm: true,
        isPrivate: true,
        createdBy: userId,
        members: {
          create: [{ userId }, { userId: targetUserId }],
        },
      },
      include: { members: { include: { user: { select: { id: true, username: true, avatar: true } } } } },
    })
  }

  async getMyDms(userId: string) {
    return this.prisma.room.findMany({
      where: {
        isDm: true,
        members: { some: { userId } },
      },
      include: {
        members: { include: { user: { select: { id: true, username: true, avatar: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async getAllUsers(excludeUserId: string) {
    return this.prisma.user.findMany({
      where: { id: { not: excludeUserId } },
      select: { id: true, username: true, avatar: true },
      orderBy: { username: 'asc' },
    })
  }

  async sendMessage(roomId: string, userId: string, content: string) {
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    })
    if (!member) throw new ForbiddenException('Not a member of this room')

    return this.prisma.message.create({
      data: { roomId, userId, content },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    })
  }

  async searchMessages(roomId: string, query: string, userId: string) {
    // Verify membership
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    })
    if (!member) throw new ForbiddenException('Not a member of this room')

    return this.prisma.message.findMany({
      where: {
        roomId,
        content: { contains: query, mode: 'insensitive' },
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
  }

  async getMessages(roomId: string, take = 50, skip = 0) {    const room = await this.prisma.room.findUnique({ where: { id: roomId } })
    if (!room) throw new NotFoundException('Room not found')

    return this.prisma.message.findMany({
      where: { roomId },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        reactions: {
          select: { emoji: true, userId: true },
        },
        replyTo: {
          include: { user: { select: { id: true, username: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    })
  }
}
