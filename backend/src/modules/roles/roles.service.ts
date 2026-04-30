import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  findAll(): Promise<Role[]> {
    return this.roleRepo.find();
  }

  findByName(name: string): Promise<Role | null> {
    return this.roleRepo.findOne({ where: { name } });
  }
}
