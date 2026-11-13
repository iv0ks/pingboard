// Update DTO for PATCH /api/users/:id.
//
// ⚠️ Note how loose this is: every field is optional and the validator is NOT
// configured to strip unknown/forbidden properties. Combined with the service
// spreading the whole payload into the UPDATE, this is the mass-assignment half
// of the vulnerability — a client can set `role`, `verified` or `secretNote`,
// none of which a profile edit should ever touch.
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  location?: string;

  // These three should NOT be here for a profile edit. They are accepted on
  // purpose so the lab can demonstrate mass assignment.
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsString()
  secretNote?: string;
}
