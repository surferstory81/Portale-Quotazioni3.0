import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QuotationsService } from './quotations.service';
import {
  CreateQuotationDto,
  ListQuotationsQueryDto,
  UpdateQuotationDto,
} from './dto/quotations.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User } from '../../entities/user.entity';

@ApiTags('quotations')
@ApiBearerAuth()
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser() user: User, @Body() dto: CreateQuotationDto) {
    return this.quotationsService.create(user, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @CurrentUser() user: User,
    @Query() query: ListQuotationsQueryDto,
  ) {
    return this.quotationsService.findUserQuotations(user.id, query);
  }

  @Get('completed')
  @UseGuards(JwtAuthGuard)
  async completed(@CurrentUser() user: User) {
    return this.quotationsService.findCompletedByUser(user.id);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.quotationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateRejected(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateQuotationDto,
  ) {
    return this.quotationsService.updateRejected(id, user.id, dto);
  }
}
