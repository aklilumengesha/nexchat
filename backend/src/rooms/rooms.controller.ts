import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common'
import { RoomsService } from './rooms.service'
import { CreateRoomDto } from './dto/create-room.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  // ── Static routes FIRST (before :id) ──────────────────────────────

  @Get()
  findAll() {
    return this.roomsService.findAll()
  }

  @Post()
  create(@Body() dto: CreateRoomDto, @Request() req: any) {
    return this.roomsService.create(dto, req.user.id)
  }

  @Get('dm/list')
  getMyDms(@Request() req: any) {
    return this.roomsService.getMyDms(req.user.id)
  }

  @Post('dm/:targetUserId')
  findOrCreateDm(@Param('targetUserId') targetUserId: string, @Request() req: any) {
    return this.roomsService.findOrCreateDm(req.user.id, targetUserId)
  }

  @Get('users/all')
  getAllUsers(@Request() req: any) {
    return this.roomsService.getAllUsers(req.user.id)
  }

  // ── Parameterized routes AFTER ─────────────────────────────────────

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id)
  }

  @Post(':id/join')
  join(@Param('id') id: string, @Request() req: any) {
    return this.roomsService.join(id, req.user.id)
  }

  @Delete(':id/leave')
  leave(@Param('id') id: string, @Request() req: any) {
    return this.roomsService.leave(id, req.user.id)
  }

  @Get(':id/messages')
  getMessages(
    @Param('id') id: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.roomsService.getMessages(id, take ? +take : 50, skip ? +skip : 0)
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Request() req: any,
  ) {
    return this.roomsService.sendMessage(id, req.user.id, body.content)
  }

  @Get(':id/search')
  searchMessages(
    @Param('id') id: string,
    @Query('q') q: string,
    @Request() req: any,
  ) {
    return this.roomsService.searchMessages(id, q || '', req.user.id)
  }
}
