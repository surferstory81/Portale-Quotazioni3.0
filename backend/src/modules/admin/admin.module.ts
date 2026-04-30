import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Quotation } from '../../entities/quotation.entity';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { AppSetting } from '../../entities/app-setting.entity';
import { EmailVerificationToken } from '../../entities/email-verification-token.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([Quotation, User, Role, RefreshToken, AppSetting, EmailVerificationToken]), EmailModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
