import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Role } from './role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  matricola: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'boolean', default: false, name: 'is_verified' })
  isVerified: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_blocked' })
  isBlocked: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'blocked_at' })
  blockedAt: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'local',
    name: 'auth_provider',
  })
  authProvider: string; // 'local' | 'sso'

  @ManyToOne(() => Role, (role) => role.users, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(
    () => require('./quotation.entity').Quotation,
    (q: any) => q.createdBy,
  )
  quotations: any[];

  @OneToMany(
    () => require('./quotation.entity').Quotation,
    (q: any) => q.assignedAdmin,
  )
  assignedQuotations: any[];
}
