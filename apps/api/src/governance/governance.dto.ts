import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';

@ObjectType('FeatureImportance')
export class FeatureImportanceType {
  @Field()
  @ApiProperty()
  feature!: string;

  @Field(() => Float)
  @ApiProperty()
  importancePct!: number;

  @Field()
  @ApiProperty()
  description!: string;
}

@ObjectType('BenchmarkMetric')
export class BenchmarkMetricType {
  @Field()
  @ApiProperty()
  problem!: string;

  @Field(() => Float)
  @ApiProperty()
  medianHours!: number;

  @Field()
  @ApiProperty()
  comparison!: string;
}

@ObjectType('ModelV1Metadata')
export class ModelV1MetadataType {
  @Field()
  @ApiProperty()
  name!: string;

  @Field()
  @ApiProperty()
  modelVersion!: string;

  @Field()
  @ApiProperty({ enum: ['WITHHELD_AT_GATE', 'ACTIVE_PRODUCTION', 'DEPRECATED'] })
  status!: string;

  @Field(() => Float)
  @ApiProperty()
  baseRate!: number;

  @Field()
  @ApiProperty()
  reason!: string;

  @Field()
  @ApiProperty()
  gatePassed!: boolean;

  @Field(() => Int)
  @ApiProperty()
  testHoldoutRecords!: number;

  @Field(() => Int)
  @ApiProperty()
  testPositiveCount!: number;

  @Field()
  @ApiProperty()
  modelCardUrl!: string;

  @Field()
  @ApiProperty()
  modelCardSummary!: string;
}

@ObjectType('ModelV2Metadata')
export class ModelV2MetadataType {
  @Field()
  @ApiProperty()
  name!: string;

  @Field()
  @ApiProperty()
  modelVersion!: string;

  @Field()
  @ApiProperty({ enum: ['WITHHELD_AT_GATE', 'ACTIVE_PRODUCTION', 'DEPRECATED'] })
  status!: string;

  @Field()
  @ApiProperty()
  target!: string;

  @Field(() => Float)
  @ApiProperty()
  holdoutMae!: number;

  @Field(() => Float)
  @ApiProperty()
  holdoutRmse!: number;

  @Field(() => Float)
  @ApiProperty()
  holdoutMedAe!: number;

  @Field(() => Float)
  @ApiProperty()
  baselineMae!: number;

  @Field(() => Float)
  @ApiProperty()
  baselineRmse!: number;

  @Field(() => Float)
  @ApiProperty()
  baselineMedAe!: number;

  @Field()
  @ApiProperty({ description: 'True when the HistGBR challenger has lower holdout MAE than the grouped-median baseline' })
  beatsBaseline!: boolean;

  @Field()
  @ApiProperty({ description: 'The estimator that actually produces predicted_ttc_hours in the API' })
  servingMethod!: string;

  @Field()
  @ApiProperty({ description: 'Where the training/evaluation rows came from' })
  trainingDataSource!: string;

  @Field(() => Int)
  @ApiProperty()
  holdoutRecords!: number;

  @Field(() => [FeatureImportanceType])
  @ApiProperty({ type: [FeatureImportanceType] })
  featureImportances!: FeatureImportanceType[];

  @Field(() => [BenchmarkMetricType])
  @ApiProperty({ type: [BenchmarkMetricType] })
  benchmarks!: BenchmarkMetricType[];
}

@ObjectType('ModelGovernance')
export class ModelGovernanceType {
  @Field()
  @ApiProperty()
  asOf!: string;

  @Field()
  @ApiProperty()
  headline!: string;

  @Field(() => ModelV1MetadataType)
  @ApiProperty({ type: () => ModelV1MetadataType })
  modelV1!: ModelV1MetadataType;

  @Field(() => ModelV2MetadataType)
  @ApiProperty({ type: () => ModelV2MetadataType })
  modelV2!: ModelV2MetadataType;
}
