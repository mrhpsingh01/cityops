import { BadRequestException } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export interface AnalysisFilters {
  from: string;
  toExclusive: string;
  problem?: string;
  borough?: string;
  agency?: string;
  communityBoard?: string;
  incidentZip?: string;
}

export const DEFAULT_FILTERS = { from: '2025-01-18', toExclusive: '2025-02-01' };

export class AnalysisQueryDto {
  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional({ example: '2025-02-01', description: 'Exclusive end date' })
  @IsOptional() @IsString() toExclusive?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() problem?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() borough?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() agency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() communityBoard?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() incidentZip?: string;
  @ApiPropertyOptional({ enum: ['day', 'week'] })
  @IsOptional() @IsIn(['day', 'week']) grouping?: 'day' | 'week';
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function parseDate(value: string): number {
  if (!DATE_RE.test(value)) throw new BadRequestException('Dates must use YYYY-MM-DD');
  const ms = Date.parse(value + 'T00:00:00Z');
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) {
    throw new BadRequestException('Invalid calendar date');
  }
  return ms;
}

export function normalizeFilters(input: Partial<AnalysisFilters>): AnalysisFilters {
  const from = input.from ?? DEFAULT_FILTERS.from;
  const toExclusive = input.toExclusive ?? DEFAULT_FILTERS.toExclusive;
  const start = parseDate(from);
  const end = parseDate(toExclusive);
  if (end <= start || end - start > 366 * 86400000) {
    throw new BadRequestException('Date range must be between 1 and 366 days');
  }
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string' && value.length > 120) {
      throw new BadRequestException(`${key} is too long`);
    }
  }
  return {
    from, toExclusive,
    problem: input.problem || undefined,
    borough: input.borough || undefined,
    agency: input.agency || undefined,
    communityBoard: input.communityBoard || undefined,
    incidentZip: input.incidentZip || undefined,
  };
}

export function filterSql(filters: AnalysisFilters, alias = 'r') {
  const c = alias ? alias + '.' : '';
  return {
    values: [
      filters.from, filters.toExclusive, filters.problem ?? null,
      filters.borough ?? null, filters.agency ?? null,
      filters.communityBoard ?? null, filters.incidentZip ?? null,
    ],
    where: `${c}created_at_local >= $1::timestamp
      AND ${c}created_at_local < $2::timestamp
      AND ($3::text IS NULL OR ${c}problem = $3)
      AND ($4::text IS NULL OR ${c}borough = $4)
      AND ($5::text IS NULL OR ${c}agency_code = $5)
      AND ($6::text IS NULL OR ${c}community_board = $6)
      AND ($7::text IS NULL OR ${c}incident_zip = $7)`,
  };
}
