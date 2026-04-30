import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Log } from '../../entities/log.entity';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(Log)
    private readonly logRepo: Repository<Log>,
  ) {}

  async create(data: Partial<Log>): Promise<Log> {
    const log = this.logRepo.create(data);
    return this.logRepo.save(log);
  }

  findAll(): Promise<Log[]> {
    return this.logRepo.find({ relations: ['user'], order: { createdAt: 'DESC' } });
  }
}
