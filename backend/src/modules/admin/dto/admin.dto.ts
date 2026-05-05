import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const ALLOWED_ADMIN_STATUS_TRANSITIONS = [
  'IN VALUTAZIONE',
  'RESPINTA',
  'COMPLETATA',
] as const;

export class UpdateQuotationStatusDto {
  @IsString({ message: 'Lo stato deve essere una stringa.' })
  @IsIn(ALLOWED_ADMIN_STATUS_TRANSITIONS, {
    message: `Lo stato deve essere uno tra: ${ALLOWED_ADMIN_STATUS_TRANSITIONS.join(', ')}`,
  })
  status: string;
}

export class SetEconomicQuotationDto {
  @IsNumber({}, { message: 'La quotazione economica deve essere un numero.' })
  @Min(0, { message: 'La quotazione economica non puo essere negativa.' })
  totalAmount: number;
}

export class SetManualCapexOpexDto {
  @IsNumber({}, { message: 'Il CAPEX deve essere un numero.' })
  @Min(0, { message: 'Il CAPEX non puo essere negativo.' })
  manualCapex: number;

  @IsNumber({}, { message: 'Il OPEX deve essere un numero.' })
  @Min(0, { message: 'Il OPEX non puo essere negativo.' })
  manualOpex: number;
}

export class AssignAdminRoleDto {
  @IsBoolean({ message: 'Il valore assignAdmin deve essere booleano.' })
  assignAdmin: boolean;
}

export class BlockUserDto {
  @IsBoolean({ message: 'Il valore isBlocked deve essere booleano.' })
  isBlocked: boolean;
}

export class UpdateSystemSettingDto {
  @IsBoolean({ message: 'Il valore deve essere booleano.' })
  value: boolean;
}

export class AdminResetPasswordDto {
  @IsString({ message: 'La password deve essere una stringa.' })
  @MaxLength(255, {
    message: 'La password non puo superare 255 caratteri.',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.,;:_\-+=^~#|]).{8,}$/, {
    message:
      "La password deve contenere almeno 8 caratteri, una minuscola, una maiuscola, un numero e un carattere speciale (@ $ ! % * ? & . , ; : _ - + = ^ ~ # |).",
  })
  newPassword: string;
}
