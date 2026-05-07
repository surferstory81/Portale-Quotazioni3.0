import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'La matricola è obbligatoria' })
  @IsString()
  @MaxLength(50)
  matricola: string;

  @IsNotEmpty({ message: "L'email è obbligatoria" })
  @IsEmail({}, { message: 'Formato email non valido' })
  email: string;

  @IsNotEmpty({ message: 'La password è obbligatoria' })
  @IsString()
  @MinLength(8, { message: 'La password deve avere almeno 8 caratteri' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.,;:_\-+=^~#|])/, {
    message:
      "La password deve contenere almeno: una maiuscola, una minuscola, un numero e un carattere speciale (@ $ ! % * ? & . , ; : _ - + = ^ ~ # |)",
  })
  password: string;
}

export class LoginDto {
  @IsNotEmpty({ message: "L'email o matricola è obbligatoria" })
  @IsString()
  username: string; // Can be email or matricola

  @IsNotEmpty({ message: 'La password è obbligatoria' })
  @IsString()
  password: string;
}

export class ForgotPasswordDto {
  @IsNotEmpty({ message: "L'email è obbligatoria" })
  @IsEmail({}, { message: 'Formato email non valido' })
  email: string;
}

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Il token è obbligatorio' })
  @IsString()
  token: string;

  @IsNotEmpty({ message: 'La nuova password è obbligatoria' })
  @IsString()
  @MinLength(8, { message: 'La password deve avere almeno 8 caratteri' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.,;:_\-+=^~#|])/, {
    message:
      "La password deve contenere almeno: una maiuscola, una minuscola, un numero e un carattere speciale (@ $ ! % * ? & . , ; : _ - + = ^ ~ # |)",
  })
  newPassword: string;
}

export class ResendVerificationDto {
  @IsNotEmpty({ message: "L'email è obbligatoria" })
  @IsEmail({}, { message: 'Formato email non valido' })
  email: string;
}

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'Il refresh token è obbligatorio' })
  @IsString()
  refreshToken: string;
}
