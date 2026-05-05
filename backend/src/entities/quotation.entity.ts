import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';

export enum QuotationStatus {
  INVIATA = 'INVIATA',
  IN_VALUTAZIONE = 'IN VALUTAZIONE',
  RESPINTA = 'RESPINTA',
  COMPLETATA = 'COMPLETATA',
}

@Entity('quotations')
export class Quotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, name: 'project_code' })
  projectCode: string;

  @Column({ type: 'varchar', length: 120, name: 'project_name' })
  projectName: string;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: QuotationStatus.INVIATA,
  })
  status: QuotationStatus;

  @Column({ type: 'jsonb', name: 'form_data', default: () => "'{}'::jsonb" })
  formData: Record<string, unknown>;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'manual_capex' })
  manualCapex: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'manual_opex' })
  manualOpex: number | null;

  @ManyToOne(() => User, (user) => user.quotations)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @ManyToOne(() => User, (user) => user.assignedQuotations, { nullable: true })
  @JoinColumn({ name: 'assigned_admin_id' })
  assignedAdmin: User | null;

  @Column({ type: 'timestamp', nullable: true, name: 'taken_in_charge_at' })
  takenInChargeAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(
    () => require('./quotation-detail.entity').QuotationDetail,
    (d: any) => d.quotation,
  )
  details: any[];
}
