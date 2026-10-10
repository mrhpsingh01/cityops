import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalysisQueryDto } from '../analytics/filters';
import { RequestsService } from './requests.service';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

class RequestQueryDto extends AnalysisQueryDto {
  @ApiPropertyOptional({ maximum: 100, default: 25 })
  @IsOptional() @IsString() pageSize?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() cursor?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() requestId?: string;
}

@ApiTags('requests')
@Controller()
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get('requests')
  @ApiOperation({ summary: 'Keyset paginated requests (maximum 100 per page)' })
  list(@Query() query: RequestQueryDto) {
    return this.requests.list(query, query);
  }

  @Get('requests/:id')
  detail(@Param('id') id: string) { return this.requests.detail(id); }

  @Get('exports/requests.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="cityops-requests.csv"')
  @ApiOperation({ summary: 'Filtered CSV export; errors if over 5,000 rows' })
  export(@Query() query: RequestQueryDto) {
    return this.requests.exportCsv(query, query.requestId);
  }
}
