import { InputType, Field } from '@nestjs/graphql';
import { QueryMode } from './query-mode.enum';
import { NestedStringNullableFilter } from './nested-string-nullable-filter.input';

@InputType({})
export class StringNullableFilter {

    @Field(() => String, {
            nullable: true,
            description: undefined
        })
    equals?: string | null;

    @Field(() => [String], {
            nullable: true,
            description: undefined
        })
    in?: string | string[] | null;

    @Field(() => [String], {
            nullable: true,
            description: undefined
        })
    notIn?: string | string[] | null;

    @Field(() => String, {
            nullable: true,
            description: undefined
        })
    lt?: string | null;

    @Field(() => String, {
            nullable: true,
            description: undefined
        })
    lte?: string | null;

    @Field(() => String, {
            nullable: true,
            description: undefined
        })
    gt?: string | null;

    @Field(() => String, {
            nullable: true,
            description: undefined
        })
    gte?: string | null;

    @Field(() => String, {
            nullable: true,
            description: undefined
        })
    contains?: string | null;

    @Field(() => String, {
            nullable: true,
            description: undefined
        })
    startsWith?: string | null;

    @Field(() => String, {
            nullable: true,
            description: undefined
        })
    endsWith?: string | null;

    @Field(() => QueryMode, {
            nullable: true,
            description: undefined
        })
    mode?: QueryMode | null;

    @Field(() => NestedStringNullableFilter, {
            nullable: true,
            description: undefined
        })
    not?: string | NestedStringNullableFilter | null;
}