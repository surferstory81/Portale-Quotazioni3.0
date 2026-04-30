import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import {
  AdminResetPasswordDto,
  AssignAdminRoleDto,
  BlockUserDto,
  SetEconomicQuotationDto,
  UpdateQuotationStatusDto,
  UpdateSystemSettingDto,
} from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Quotazioni ───────────────────────────────────────────

  @Get('quotations')
  async findAllQuotations() {
    return this.adminService.findAllQuotations();
  }

  @Post('quotations/:id/take-in-charge')
  async takeInCharge(@Param('id') id: string, @CurrentUser() user: User) {
    return this.adminService.takeInCharge(id, user);
  }

  @Patch('quotations/:id/status')
  async updateQuotationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateQuotationStatusDto,
  ) {
    return this.adminService.updateQuotationStatus(id, dto.status);
  }

  @Patch('quotations/:id/economic-quotation')
  async setEconomicQuotation(
    @Param('id') id: string,
    @Body() dto: SetEconomicQuotationDto,
  ) {
    return this.adminService.setEconomicQuotation(id, dto.totalAmount);
  }

  // ─── Utenti ───────────────────────────────────────────────

  @Get('users')
  async listUsers() {
    return this.adminService.listUsers();
  }

  @Patch('users/:id/role')
  async assignAdminRole(
    @Param('id') id: string,
    @Body() dto: AssignAdminRoleDto,
  ) {
    return this.adminService.assignAdminRole(id, dto.assignAdmin);
  }

  @Patch('users/:id/block')
  async blockUser(@Param('id') id: string, @Body() dto: BlockUserDto) {
    return this.adminService.blockUser(id, dto.isBlocked);
  }

  @Patch('users/:id/reset-password')
  async resetUserPassword(
    @Param('id') id: string,
    @Body() dto: AdminResetPasswordDto,
  ) {
    return this.adminService.resetUserPassword(id, dto.newPassword);
  }

  @Patch('users/:id/verify-email')
  async verifyUserEmail(@Param('id') id: string) {
    return this.adminService.verifyUserEmail(id);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() admin: User,
  ) {
    return this.adminService.deleteUser(id, admin.id);
  }

  // ─── Impostazioni di sistema ──────────────────────────────

  @Get('settings')
  async getSystemSettings() {
    return this.adminService.getSystemSettings();
  }

  @Patch('settings/:key')
  async setSystemSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSystemSettingDto,
  ) {
    return this.adminService.setSystemSetting(key, dto.value);
  }
}
