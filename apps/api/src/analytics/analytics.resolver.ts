import { Args, Field, Float, InputType, Int, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { MetricsService } from './metrics.service';
import { normalizeFilters } from './filters';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class AnalysisFilterInput {
  @Field({ nullable: true }) @IsOptional() @IsString() from?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() toExclusive?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() problem?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() borough?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() agency?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() communityBoard?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() incidentZip?: string;
}

@ObjectType()
export class OverviewType {
  @Field(() => Int) requestCount!: number;
  @Field(() => Int) previousCount!: number;
  @Field(() => Float, { nullable: true }) periodChange!: number | null;
  @Field(() => Int) openCount!: number;
  @Field(() => Int) eligibleCount!: number;
  @Field(() => Float, { nullable: true }) sevenDayClosureRate!: number | null;
  @Field(() => Float, { nullable: true }) medianCloseHours!: number | null;
  @Field(() => Int) closedSample!: number;
  @Field(() => Int) invalidDurationCount!: number;
  @Field() asOf!: string;
  @Field() from!: string;
  @Field() toExclusive!: string;
}

@ObjectType()
export class TrendPointType {
  @Field() period!: string;
  @Field(() => Int) requestCount!: number;
}
@ObjectType()
export class ProblemType {
  @Field() problem!: string;
  @Field(() => Int) requestCount!: number;
}
@ObjectType()
export class AreaType {
  @Field() borough!: string;
  @Field(() => Int) requestCount!: number;
}
@ObjectType()
export class CohortType {
  @Field() week!: string;
  @Field(() => Int) eligible!: number;
  @Field(() => Int) closedWithin7!: number;
  @Field(() => Float, { nullable: true }) rate!: number | null;
}
@ObjectType()
export class DurationType {
  @Field() problem!: string;
  @Field(() => Int) sample!: number;
  @Field(() => Float, { nullable: true }) p50Hours!: number | null;
  @Field(() => Float, { nullable: true }) p75Hours!: number | null;
  @Field(() => Float, { nullable: true }) p90Hours!: number | null;
  @Field(() => Int) openCount!: number;
}
@ObjectType()
export class BacklogType {
  @Field() band!: string;
  @Field(() => Int) requestCount!: number;
}
@ObjectType()
export class ResolutionType {
  @Field(() => [CohortType]) cohorts!: CohortType[];
  @Field(() => [DurationType]) durations!: DurationType[];
  @Field(() => [BacklogType]) backlog!: BacklogType[];
  @Field() asOf!: string;
}

@Resolver()
export class AnalyticsResolver {
  constructor(private readonly metrics: MetricsService) {}

  @Query(() => OverviewType)
  overview(@Args('filters', { type: () => AnalysisFilterInput }) filters: AnalysisFilterInput) {
    return this.metrics.getOverview(normalizeFilters(filters));
  }
  @Query(() => [TrendPointType])
  intakeTrend(
    @Args('filters', { type: () => AnalysisFilterInput }) filters: AnalysisFilterInput,
    @Args('grouping', { type: () => String, defaultValue: 'day' }) grouping: string,
  ) {
    if (grouping !== 'day' && grouping !== 'week') throw new Error('Invalid grouping');
    return this.metrics.getTrend(normalizeFilters(filters), grouping);
  }
  @Query(() => [ProblemType])
  problemBreakdown(@Args('filters', { type: () => AnalysisFilterInput }) filters: AnalysisFilterInput) {
    return this.metrics.getProblems(normalizeFilters(filters));
  }
  @Query(() => [AreaType])
  areaComparison(@Args('filters', { type: () => AnalysisFilterInput }) filters: AnalysisFilterInput) {
    return this.metrics.getAreas(normalizeFilters(filters));
  }
  @Query(() => ResolutionType)
  resolution(@Args('filters', { type: () => AnalysisFilterInput }) filters: AnalysisFilterInput) {
    return this.metrics.getResolution(normalizeFilters(filters));
  }
}
