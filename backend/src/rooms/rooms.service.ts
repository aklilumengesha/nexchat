import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateRoomDto } from './dto/create-room.dto'

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.room.findMany({
      where: { isPrivate: false },
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

  async getMessages(roomId: string, take = 50, skip = 0) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } })
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
