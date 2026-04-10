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

  @Get()
  findAll() {
    return this.roomsService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateRoomDto, @Request() req: any) {
    return this.roomsService.create(dto, req.user.id)
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
}
