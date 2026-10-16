import { Field, Float, InputType, Int, ObjectType } from '@nestjs/graphql';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

@InputType('HotspotFilterInput')
export class HotspotFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  from?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  toExclusive?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  problem?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  borough?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  hoursBack?: number;
}

export class HotspotQueryDto {
  @ApiPropertyOptional({ description: 'Filter start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'Filter end date (exclusive, YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  toExclusive?: string;

  @ApiPropertyOptional({ description: 'Complaint type / problem' })
  @IsOptional()
  @IsString()
  problem?: string;

  @ApiPropertyOptional({ description: 'Borough name' })
  @IsOptional()
  @IsString()
  borough?: string;

  @ApiPropertyOptional({ description: 'Rolling hours back from cutoff (default 168)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  hoursBack?: number;
}

@ObjectType('GeoJsonPoint')
export class GeoJsonPointType {
  @Field()
  @ApiProperty()
  type!: string;

  @Field(() => [Float])
  @ApiProperty({ type: [Number] })
  coordinates!: number[];
}

@ObjectType('GeoJsonGeometry')
export class GeoJsonGeometryType {
  @Field()
  @ApiProperty()
  type!: string;

  @Field(() => String)
  @ApiProperty({ description: 'Raw GeoJSON geometry JSON string' })
  rawJson!: string;
}

@ObjectType('HotspotCluster')
export class HotspotClusterType {
  @Field()
  @ApiProperty()
  clusterId!: string;

  @Field()
  @ApiProperty()
  complaintType!: string;

  @Field()
  @ApiProperty()
  borough!: string;

  @Field(() => Int)
  @ApiProperty()
  incidentCount!: number;

  @Field(() => GeoJsonPointType)
  @ApiProperty({ type: () => GeoJsonPointType })
  centroid!: GeoJsonPointType;

  @Field(() => GeoJsonGeometryType)
  @ApiProperty({ type: () => GeoJsonGeometryType })
  boundingHull!: GeoJsonGeometryType;

  @Field(() => Float)
  @ApiProperty()
  radiusMeters!: number;

  @Field()
  @ApiProperty()
  firstReportedAt!: string;

  @Field()
  @ApiProperty()
  latestReportedAt!: string;

  @Field()
  @ApiProperty({ enum: ['CRITICAL', 'ELEVATED', 'MONITOR'] })
  severityTier!: 'CRITICAL' | 'ELEVATED' | 'MONITOR';

  @Field()
  @ApiProperty()
  triageHypothesis!: string;

  @Field(() => Float)
  @ApiProperty()
  predictedTtcHours!: number;

  @Field()
  @ApiProperty()
  ttcComparison!: string;
}

@ObjectType('DispatchAlertResult')
export class DispatchAlertResultType {
  @Field()
  @ApiProperty()
  dispatchId!: string;

  @Field()
  @ApiProperty()
  clusterId!: string;

  @Field()
  @ApiProperty()
  dispatchedAt!: string;

  @Field()
  @ApiProperty({ enum: ['delivered', 'simulated', 'failed'] })
  status!: 'delivered' | 'simulated' | 'failed';

  @Field()
  @ApiProperty()
  channel!: string;

  @Field(() => String, { nullable: true })
  @ApiProperty({ nullable: true })
  destinationUrl!: string | null;

  @Field(() => Int)
  @ApiProperty()
  responseStatus!: number;

  @Field()
  @ApiProperty()
  payloadPreview!: string;

  @Field()
  @ApiProperty()
  message!: string;
}
