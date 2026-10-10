import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { DatabaseModule } from './database/database.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { RequestsModule } from './requests/requests.module';
import { MetadataModule } from './metadata/metadata.module';
import { HealthModule } from './health/health.module';
import { GraphQLError, ValidationContext } from 'graphql';

const queryBudgetRule = (context: ValidationContext) => {
  let fields = 0;
  return {
    Field(node: import('graphql').FieldNode, _key: unknown, _parent: unknown, _path: unknown, ancestors: readonly unknown[]) {
      fields += 1;
      const depth = ancestors.filter((ancestor) => typeof ancestor === 'object' && ancestor !== null
        && 'kind' in ancestor && ancestor.kind === 'Field').length + 1;
      if (fields > 50 || depth > 6) {
        context.reportError(new GraphQLError('GraphQL query exceeds the CityOps field or depth budget', { nodes: node }));
      }
    },
  };
};

@Module({
  imports: [
    DatabaseModule,
    AnalyticsModule,
    RequestsModule,
    MetadataModule,
    HealthModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      path: '/graphql',
      graphiql: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
      validationRules: [queryBudgetRule],
    }),
  ],
})
export class AppModule {}
