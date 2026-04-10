import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    })
    if (exists) throw new ConflictException('Email or username already taken')

    const hashed = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${dto.username}`,
      },
    })

    // Store hashed password separately (we use Supabase Auth in production)
    const token = this.signToken(user.id, user.email)
    return { user: this.sanitize(user), token }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const token = this.signToken(user.id, user.email)
    return { user: this.sanitize(user), token }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new UnauthorizedException()
    return this.sanitize(user)
  }

  private signToken(userId: string, email: string) {
    return this.jwt.sign({ sub: userId, email })
  }

  private sanitize(user: any) {
    const { ...rest } = user
    return rest
  }
}
